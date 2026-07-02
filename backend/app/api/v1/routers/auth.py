from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import random
from typing import Optional, Union

from app.schemas.base import BaseResponse
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, Token, UserCreate, UserLogin, VerifyCodeRequest, ChangePasswordRequest, ChangeEmailRequest, VerifyChangeEmailRequest, Enable2FARequest, Verify2FARequest, LoginResponse, DeactivateAccountRequest, VerifyEmail2SARequest
from app.core.database import get_db
from app.crud.user import get_by_email, create, get_by_email_or_username, verify
from app.crud.auth import create_password_reset_code, create_verification_code, delete_code, delete_reset_code, get_valid_code, get_valid_refresh_token, get_valid_reset_code, revoke_refresh_token, store_refresh_token, revoke_all_user_refresh_tokens, generate_2fa_secret, verify_2fa_code
from app.services.email import send_password_reset_email, send_verification_email, send_verification_email_sync
from app.core.security import create_access_token, create_refresh_token, get_current_user, verify_password, hash_password, verify_2fa_token, verify_token
from app.schemas.refresh_token import RefreshTokenRequest
from app.models.user import User
from app.crud.system_log import log_user_activity
import pyotp
import base64
import qrcode
from io import BytesIO
from datetime import timedelta

router = APIRouter()

@router.post("/refresh", response_model=LoginResponse)
def refresh_token(
    req: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    rt = get_valid_refresh_token(db, req.refresh_token)
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid or expired refresh token"
        )

    revoke_refresh_token(db, req.refresh_token)
    new_access = create_access_token(rt.user_id)
    new_refresh = create_refresh_token(rt.user_id)
    store_refresh_token(db, rt.user_id, new_refresh)
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, rt.user_id, "refresh_token", ip_address, user_agent)

    return Token(
        access_token=new_access, 
        refresh_token=new_refresh,
        token_type="bearer"
    )


@router.post("/register", response_model=BaseResponse)
async def register(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
):
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Email already registered"
        )
    
    existing_username = db.query(User).filter(User.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Username already taken"
        )
    
    code = "".join(random.choices("0123456789", k=6))
    
    new_user = create(db, user_in)
    
    create_verification_code(db, new_user.id, code)
    
    email_sent = False
    try:
        email_sent = send_verification_email_sync(user_in.email, code)
    except Exception:
        background_tasks.add_task(send_verification_email_sync, user_in.email, code)
    
    if email_sent:
        return BaseResponse(
            success=True,
            msg="Verification email sent! Please check your inbox.",
            data={"email": user_in.email}
        )
    else:
        return BaseResponse(
            success=True,
            msg="Registration complete! Check your email for verification code.",
            data={"email": user_in.email}
        )


@router.post("/verify-code", response_model=Token)
def verify_code(
    req: VerifyCodeRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_by_email(db, req.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User not found"
        )

    code_obj = get_valid_code(db, user.id, req.code)
    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid or expired code"
        )

    verify(db, user.id)
    delete_code(db, code_obj.id)
    
    access_token = create_access_token(user.id)
    refresh_token_jwt = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_token_jwt)
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, user.id, "login", ip_address, user_agent)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token_jwt,
        token_type="bearer"
    )

@router.post("/login", response_model=Union[Token, LoginResponse])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    user = get_by_email_or_username(db, form_data.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support or use reactivation."
        )
        
    if user.is_2fa_enabled:
        temp_token = create_access_token(
            user.id,
            expires_delta=timedelta(minutes=5),
            token_type="2fa",
            scope="2fa"
        )
        return LoginResponse(
            requires_2fa=True,
            temp_token=temp_token,
            method="totp"
        )
        
    if user.is_email_2sa_enabled:
        code = "".join(random.choices("0123456789", k=6))
        create_verification_code(db, user.id, code)

        send_verification_email_sync(
            user.email,
            f"Your login verification code is {code}"
        )

        temp_token = create_access_token(
            user.id,
            expires_delta=timedelta(minutes=5),
            scope="email_2sa"
        )

        return LoginResponse(
            requires_2fa=True,
            temp_token=temp_token,
            method="email"
        )

    access_token = create_access_token(user.id)
    refresh_token_jwt = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_token_jwt)
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        log_user_activity(db, user.id, "login", ip_address, user_agent)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token_jwt,
        token_type="bearer"
    )

@router.post("/logout", response_model=BaseResponse)
def logout(
    logout_request: RefreshTokenRequest,  # Use existing RefreshTokenRequest schema
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    revoke_refresh_token(db, logout_request.refresh_token)
    
    log_user_activity(db, current_user.id, "logout", ip_address, user_agent)
    
    return BaseResponse(
        success=True,
        msg="Logged out successfully"
    )

# @router.post("/resend-verification", response_model=BaseResponse)
# async def resend_verification(
#     request: ResendVerificationRequest,
#     db: Session = Depends(get_db)
# ):
#     user = get_by_email(db, request.email)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="User not found"
#         )
    
#     if user.is_verified:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already verified"
#         )
    
#     code = "".join(random.choices("0123456789", k=6))
#     create_verification_code(db, user.id, code)
    
#     email_sent = await send_verification_email(request.email, code)
    
#     if not email_sent:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to send verification email"
#         )
    
#     return BaseResponse(msg="Verification code sent")


@router.post("/forgot-password", response_model=BaseResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = get_by_email(db, req.email)
    if not user:
        return BaseResponse(msg="If the email is registered, a reset code has been sent.")

    reset_obj = create_password_reset_code(db, user.id)

    email_sent = await send_password_reset_email(req.email, reset_obj.code)
    if not email_sent:
        background_tasks.add_task(send_password_reset_email, req.email, reset_obj.code)

    return BaseResponse(msg="If the email is registered, a reset code has been sent.")


@router.post("/reset-password", response_model=BaseResponse)
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    reset_obj = get_valid_reset_code(db, req.code)
    if not reset_obj:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user = db.query(User).filter(User.id == reset_obj.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    db.commit()

    delete_reset_code(db, reset_obj.id)

    return BaseResponse(msg="Password reset successfully. You can now log in.")

@router.post("/change-password", response_model=BaseResponse)
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )

    if verify_password(req.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from old password"
        )

    current_user.password_hash = hash_password(req.new_password)
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, current_user.id, "change_password", ip_address, user_agent)

    return BaseResponse(
        success=True,
        msg="Password changed successfully. Please log in again."
    )

@router.post("/change-email/request", response_model=BaseResponse)
async def request_change_email(
    req: ChangeEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.email == req.new_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must be different from current email"
        )

    if db.query(User).filter(User.email == req.new_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )

    code = "".join(random.choices("0123456789", k=6))

    create_verification_code(db, current_user.id, code)

    try:
        sent = await send_verification_email(req.new_email, code)
        if not sent:
            background_tasks.add_task(send_verification_email_sync, req.new_email, code)
    except Exception:
        background_tasks.add_task(send_verification_email_sync, req.new_email, code)

    return BaseResponse(
        success=True,
        msg="Verification code sent to new email address"
    )

@router.post("/change-email/verify", response_model=BaseResponse)
def verify_change_email(
    req: VerifyChangeEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code_obj = get_valid_code(db, current_user.id, req.code)
    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    current_user.email = req.new_email
    db.commit()

    delete_code(db, code_obj.id)

    revoke_all_user_refresh_tokens(db, current_user.id)

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, current_user.id, "change_email", ip_address, user_agent)

    return BaseResponse(
        success=True,
        msg="Email changed successfully. Please log in again."
    )
    
@router.post("/2fa/setup")
def setup_2fa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_2fa_enabled:
        raise HTTPException(400, "2FA already enabled")

    secret = generate_2fa_secret()
    current_user.twofa_secret = secret
    db.commit()

    uri = pyotp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="WhisperSpace"
    )

    return {
        "secret": secret,
        "qr_uri": uri
    }

@router.post("/2fa/enable")
def enable_2fa(
    req: Enable2FARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.twofa_secret:
        raise HTTPException(400, "2FA setup not started")

    if not verify_2fa_code(current_user, req.code):
        raise HTTPException(400, "Invalid 2FA code")

    current_user.is_2fa_enabled = True
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)

    return BaseResponse(msg="Two-factor authentication enabled")

@router.post("/2fa/verify")
def verify_2fa(
    payload: Verify2FARequest,
    request: Request,
    db: Session = Depends(get_db)
):
    temp_token = request.headers.get("Authorization")
    if not temp_token:
        raise HTTPException(status_code=401, detail="Missing temp token")

    temp_token = temp_token.replace("Bearer ", "")

    payload_data = verify_token(temp_token)
    if not payload_data or payload_data.get("scope") != "2fa":
        raise HTTPException(status_code=401, detail="Invalid or expired temp token")

    user_id = int(payload_data["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_2fa_code(user, payload.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    store_refresh_token(db, user.id, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/2fa/disable")
def disable_2fa(
    req: Verify2FARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_2fa_code(current_user, req.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.is_2fa_enabled = False
    current_user.twofa_secret = None
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)

    return BaseResponse(msg="2FA disabled")


@router.post("/reactivate-account", response_model=BaseResponse)
def reactivate_account(
    req: DeactivateAccountRequest, 
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_by_email_or_username(db, req.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials"
        )
    
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials"
        )
    
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already active"
        )
    
    user.is_active = True
    db.commit()
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, user.id, "reactivate_account", ip_address, user_agent)
    
    return BaseResponse(
        success=True,
        msg="Account reactivated. You can now log in."
    )
    
@router.post("/deactivate-account", response_model=BaseResponse)
def deactivate_account(
    req: DeactivateAccountRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already deactivated"
        )

    current_user.is_active = False
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    log_user_activity(db, current_user.id, "deactivate_account", ip_address, user_agent)

    return BaseResponse(
        success=True,
        msg="Account deactivated successfully"
    )

@router.post("/2sa/email/enable", response_model=BaseResponse)
def enable_email_2sa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.is_email_2sa_enabled = True
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)

    return BaseResponse(msg="Email two-step authentication enabled")

@router.post("/2sa/email/disable", response_model=BaseResponse)
def disable_email_2sa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.is_email_2sa_enabled = False
    db.commit()

    revoke_all_user_refresh_tokens(db, current_user.id)

    return BaseResponse(msg="Email two-step authentication disabled")

@router.post("/2sa/email/verify", response_model=Token)
def verify_email_2sa(
    payload: VerifyEmail2SARequest,
    request: Request,
    db: Session = Depends(get_db),
):
    temp_token = request.headers.get("Authorization")
    if not temp_token:
        raise HTTPException(401, "Missing temp token")

    temp_token = temp_token.replace("Bearer ", "")
    payload_data = verify_token(temp_token)

    if not payload_data or payload_data.get("scope") != "email_2sa":
        raise HTTPException(401, "Invalid or expired temp token")

    user_id = int(payload_data["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    code_obj = get_valid_code(db, user.id, payload.code)
    if not code_obj:
        raise HTTPException(400, "Invalid or expired code")

    delete_code(db, code_obj.id)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_token)

    log_user_activity(
        db,
        user.id,
        "email_2sa_login",
        request.client.host if request.client else None,
        request.headers.get("user-agent"),
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )
