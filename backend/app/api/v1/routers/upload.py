# app/api/v1/routers/upload.py
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from pathlib import Path
from typing import Optional
import base64
import traceback
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.cloudinary import configure_cloudinary, upload_to_cloudinary, delete_from_cloudinary, extract_public_id_from_url, upload_video_to_cloudinary
from app.models.user import User

# Configure Cloudinary on startup
configure_cloudinary()

router = APIRouter(tags=["upload"])

# Media configuration
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

class MediaUploadRequest(BaseModel):
    data_url: str
    filename: str
    is_diary: bool = True

@router.post("/media")
async def upload_media(
    request: MediaUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload media (image or video) to Cloudinary
    Accepts base64 data URL format: data:image/jpeg;base64,{base64_data}
    """
    try:
        print(f"📤 Upload request from user {current_user.id}: {request.filename}")
        
        # Parse the data URL
        if ',' not in request.data_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid data URL format. Expected: data:image/jpeg;base64,{data}"
            )
        
        header, base64_data = request.data_url.split(',', 1)
        
        # Extract mime type
        if ':' not in header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid data URL header format"
            )
        
        # Extract MIME type (remove data: prefix)
        mime_type = header.split(':')[1].split(';')[0]
        
        # Determine if it's video or image
        is_video = mime_type.startswith('video/')
        is_image = mime_type.startswith('image/')
        
        if not is_video and not is_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported media type: {mime_type}. Supported: image/*, video/*"
            )
        
        # Decode base64 to bytes
        try:
            file_bytes = base64.b64decode(base64_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 encoding: {str(e)}"
            )
        
        # Validate file size
        if is_image and len(file_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image too large. Maximum size is {MAX_IMAGE_SIZE // (1024*1024)}MB. Your file: {len(file_bytes) / (1024*1024):.2f}MB"
            )
        if is_video and len(file_bytes) > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video too large. Maximum size is {MAX_VIDEO_SIZE // (1024*1024)}MB. Your file: {len(file_bytes) / (1024*1024):.2f}MB"
            )
        
        # Generate unique filename
        file_extension = Path(request.filename).suffix.lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{current_user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
        folder = "diaries" if request.is_diary else "comments"
        
        print(f"📁 Uploading to folder: {folder}, filename: {unique_filename}")
        
        # Upload to Cloudinary
        if is_video:
            upload_result = upload_video_to_cloudinary(file_bytes, f"{folder}/videos")
            if not upload_result or 'secure_url' not in upload_result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload video to cloud storage."
                )
            
            response_data = {
                "url": upload_result['secure_url'],
                "thumbnail_url": upload_result.get('thumbnail_url'),
                "filename": request.filename,
                "size": len(file_bytes),
                "mime_type": mime_type,
                "is_video": True
            }
        else:
            upload_result = upload_to_cloudinary(
                file_bytes, 
                public_id=unique_filename, 
                folder=folder,
                resource_type="image"
            )
            
            if not upload_result or 'secure_url' not in upload_result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload image to cloud storage."
                )
            
            response_data = {
                "url": upload_result['secure_url'],
                "filename": request.filename,
                "size": len(file_bytes),
                "mime_type": mime_type,
                "is_video": False
            }
        
        print(f"✅ Upload successful: {response_data['url'][:50]}...")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload media: {str(e)}"
        )

@router.post("/image")
async def upload_image_direct(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint: Upload image file directly (multipart/form-data)
    """
    try:
        # Validate file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE // (1024*1024)}MB."
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{current_user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Upload to Cloudinary
        upload_result = upload_to_cloudinary(
            content, 
            public_id=unique_filename, 
            folder="diaries/images",
            resource_type="image"
        )
        
        if not upload_result or 'secure_url' not in upload_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload image to cloud storage."
            )
        
        return {
            "url": upload_result['secure_url'],
            "filename": file.filename,
            "size": len(content),
            "public_id": unique_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Image upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.post("/video")
async def upload_video_direct(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint: Upload video file directly (multipart/form-data)
    """
    try:
        # Validate file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {MAX_VIDEO_SIZE // (1024*1024)}MB."
            )
        
        # Upload to Cloudinary
        upload_result = upload_video_to_cloudinary(content, "diaries/videos")
        
        if not upload_result or 'secure_url' not in upload_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload video to cloud storage."
            )
        
        return {
            "url": upload_result['secure_url'],
            "thumbnail_url": upload_result.get('thumbnail_url'),
            "filename": file.filename,
            "size": len(content),
            "public_id": upload_result.get('public_id')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Video upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video: {str(e)}"
        )

@router.delete("/media/{public_id}")
async def delete_media(
    public_id: str,
    resource_type: str = "image",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete media from Cloudinary"""
    try:
        success = delete_from_cloudinary(public_id, resource_type=resource_type)
        
        if success:
            return {"message": "Media deleted successfully", "public_id": public_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media not found or could not be deleted"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete media: {str(e)}"
        )