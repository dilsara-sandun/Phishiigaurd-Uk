"""
services/notification_service.py
───────────────────────────────
Handles SMTP communication for sending OTPs and password reset emails.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)

async def send_smtp_email(to_email: str, subject: str, body_text: str) -> bool:
    """
    Send a plain-text email using configured SMTP settings.
    Returns True on success, False on failure.
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not set. Skipping email to %s", to_email)
        # Log the body so it can be used for debugging/manual entry in development
        logger.info("EMAIL CONTENT for %s:\nSubject: %s\nBody: %s", to_email, subject, body_text)
        return False

    msg = MIMEMultipart()
    msg['From'] = settings.EMAILS_FROM
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body_text, 'plain'))

    try:
        # SMTP_SSL for 465, or starttls for 587
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info("Successfully sent email to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    subject = f"OTP for {settings.APP_NAME}"
    body = f"Your one-time password (OTP) is: {otp}\n\nThis code will expire in {settings.OTP_EXPIRE_MINUTES} minutes."
    return await send_smtp_email(to_email, subject, body)

async def send_password_reset_email(to_email: str, token: str) -> bool:
    # In a real app, this would be a link. For this prototype, we'll send a token or link.
    # Assuming frontend has a /reset-password?token=XYZ route
    subject = f"Password Reset for {settings.APP_NAME}"
    body = f"You requested a password reset. Use the code below to reset your password:\n\n{token}\n\nIf you did not request this, please ignore this email."
    return await send_smtp_email(to_email, subject, body)
