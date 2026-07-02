import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_verification_email_sync(to_email: str, code: str) -> bool:
    """
    Simple and reliable email sending function
    """
    try:
        print(f"📧 Starting email send to: {to_email}")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Verify Your NECO360 Account'
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email
        
        # Text version
        text = f"""NECO360 Verification

Your verification code is: {code}

Enter this code in the app to verify your email.

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.
"""
        
        # HTML version
        html = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa; border-radius: 10px;">
        <h2 style="color: #333;">NECO360</h2>
        <h3 style="color: #555;">Email Verification Required</h3>
        
        <p>Hello,</p>
        
        <p>Please use the following code to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <div style="
                display: inline-block;
                font-size: 32px;
                font-weight: bold;
                color: white;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px 40px;
                border-radius: 8px;
                letter-spacing: 5px;
            ">
                {code}
            </div>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            <strong>Note:</strong> This code expires in 10 minutes.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>If you didn't create an account with NECO360, please ignore this email.</p>
            <p>© 2024 NECO360</p>
        </div>
    </div>
</body>
</html>"""
        
        # Attach parts
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        if settings.SMTP_PORT == 465:
            # SSL
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
                print(f"✅ Email sent via SSL to {to_email}")
        else:
            # TLS (587 or 2525)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
                print(f"✅ Email sent via TLS to {to_email}")
        
        return True
        
    except smtplib.SMTPAuthenticationError:
        print(f"❌ SMTP Authentication failed for {settings.SMTP_USER}")
        print("Please check your email password/API key")
        return False
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False


async def send_verification_email(to_email: str, code: str) -> bool:
    """
    Async wrapper
    """
    import asyncio
    return await asyncio.to_thread(send_verification_email_sync, to_email, code)

def send_password_reset_email_sync(to_email: str, code: str) -> bool:
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'NECO360 - Reset Your Password'
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email

        text = f"""Password Reset Request

Your password reset code is: {code}

Enter this code in the app to set a new password.
This code expires in 15 minutes.

If you didn't request this, ignore this email.
"""

        html = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa; border-radius: 10px;">
        <h2 style="color: #333;">NECO360</h2>
        <h3>Password Reset Request</h3>
        <p>Hello,</p>
        <p>You requested to reset your password. Use the code below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; font-size: 32px; font-weight: bold; color: white;
                        background: linear-gradient(135deg, #ff6b6b, #ee5a52); padding: 20px 40px;
                        border-radius: 8px; letter-spacing: 5px;">
                {code}
            </div>
        </div>
        
        <p style="color: #666;"><strong>Expires in 15 minutes.</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
</body>
</html>"""

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Same SMTP logic as before
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
        
        print(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False

async def send_password_reset_email(to_email: str, code: str) -> bool:
    import asyncio
    return await asyncio.to_thread(send_password_reset_email_sync, to_email, code)

def send_support_email_sync(problem: str, user_email: str | None = None) -> bool:
    """
    Send support request email to mokkolsambath1234@gmail.com
    """
    try:
        print(f"📧 Sending support report from {user_email or 'anonymous'}")

        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'New Support Request from NECO360 User'
        msg['From'] = settings.SMTP_FROM
        msg['To'] = 'mokkolsambath1234@gmail.com'
        if user_email:
            msg['Reply-To'] = user_email

        # Plain text version
        text = f"""
New support request:

From: {user_email or 'Not provided'}
Problem description:
{problem}
        """

        # HTML version
        html = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4;">
        <h2>New Support Request</h2>
        <p><strong>From:</strong> {user_email or 'Anonymous'}</p>
        <p><strong>Problem:</strong></p>
        <div style="background: white; padding: 15px; border-radius: 5px;">
            {problem.replace(chr(10), '<br>')}
        </div>
    </div>
</body>
</html>"""

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)

        print("Support email sent successfully")
        return True

    except Exception as e:
        print(f" Failed to send support email: {e}")
        return False

async def send_support_email(problem: str, user_email: str | None = None) -> bool:
    import asyncio
    return await asyncio.to_thread(send_support_email_sync, problem, user_email)

async def send_contact_email(user_email: str, message: str, user_name: str | None = None) -> bool:
    """Send a contact/support message to mokkolsambath1234@gmail.com"""
    import asyncio
    return await asyncio.to_thread(send_contact_email_sync, user_email, message, user_name)

def send_contact_email_sync(user_email: str, message: str, user_name: str | None = None) -> bool:
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import smtplib
        from app.core.config import settings

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'New Contact Support Message from {user_name or user_email}'
        msg['From'] = settings.SMTP_FROM
        msg['To'] = 'mokkolsambath1234@gmail.com'
        msg['Reply-To'] = user_email

        text = f"""
Name: {user_name or 'Not provided'}
Email: {user_email}
Message:
{message}
        """

        html = f"""<!DOCTYPE html>
<html>
<body>
    <h3>New Contact Support Message</h3>
    <p><strong>Name:</strong> {user_name or 'Not provided'}</p>
    <p><strong>Email:</strong> {user_email}</p>
    <p><strong>Message:</strong></p>
    <p>{message.replace(chr(10), '<br>')}</p>
</body>
</html>"""

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)

        print(f"Contact email sent from {user_email}")
        return True
    except Exception as e:
        print(f"Failed to send contact email: {e}")
        return False