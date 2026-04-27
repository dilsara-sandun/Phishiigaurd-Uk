"""
services/notification_service.py
─────────────────────────────────
Sends transactional HTML emails via SMTP.

Three email templates:
  1. send_otp_email              → Registration / email-verification OTP
  2. send_password_reset_email   → Password-reset deep-link email
  3. send_password_changed_email → "Your password was changed" confirmation
"""

import logging
import smtplib
import asyncio
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


# ── Shared HTML shell ──────────────────────────────────────────────────────────

def _html_shell(title: str, body_html: str) -> str:
    """
    Wrap *body_html* in the branded PhishGuard UK email shell.
    Uses an inline-CSS table layout for maximum email-client compatibility.
    """
    year = datetime.now(tz=timezone.utc).year
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#0d1526;border-radius:16px;
                      border:1px solid rgba(255,255,255,0.06);overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4,#0284c7);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:rgba(255,255,255,0.15);
                                 border-radius:10px;padding:6px 10px;margin-bottom:10px;">
                      🛡️
                    </span><br/>
                    <span style="color:#ffffff;font-size:22px;font-weight:700;
                                 letter-spacing:-0.5px;">PhishGuard UK</span>
                  </td>
                  <td align="right">
                    <span style="color:rgba(255,255,255,0.7);font-size:12px;">
                      Cyber Threat Protection
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              {body_html}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px;">
                This email was sent by <strong style="color:#6b7280;">PhishGuard UK</strong>.
                If you did not request this, you can safely ignore it.
              </p>
              <p style="color:#374151;font-size:11px;margin:0;">
                &copy; {year} PhishGuard UK. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Low-level SMTP sender ──────────────────────────────────────────────────────

async def _send(to_email: str, subject: str, html: str, plain: str) -> bool:
    """
    Deliver an HTML+plain-text multipart email via the configured SMTP server.
    Falls back to logging the content when SMTP credentials are absent (dev mode).
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — email to %s not sent.", to_email)
        logger.info(
            "── DEV EMAIL ──────────────────────────────────────────\n"
            "To      : %s\nSubject : %s\nPlain   :\n%s\n"
            "────────────────────────────────────────────────────────",
            to_email, subject, plain,
        )
        return False

    sender = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM}>"
    msg = MIMEMultipart("alternative")
    msg["From"]    = sender
    msg["To"]      = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.ehlo()
            server.starttls()
            server.ehlo()

        # Run blocking SMTP operations in a thread pool
        await asyncio.to_thread(server.login, settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        await asyncio.to_thread(server.send_message, msg)
        await asyncio.to_thread(server.quit)
        
        logger.info("Email sent → %s | Subject: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc, exc_info=True)
        return False


# ── Template 1: Registration OTP ──────────────────────────────────────────────

async def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send a branded OTP verification email after registration.
    """
    subject = f"Your PhishGuard UK Verification Code: {otp}"

    # Split OTP into individual digits for the styled box display
    digit_cells = "".join(
        f'<td style="width:44px;height:52px;background:#0a0f1a;border:2px solid #06b6d4;'
        f'border-radius:8px;text-align:center;vertical-align:middle;'
        f'font-size:28px;font-weight:700;color:#06b6d4;font-family:monospace;">'
        f'{d}</td>'
        for d in otp
    )

    body_html = f"""
      <!-- Greeting -->
      <h2 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 8px;">
        Verify Your Email Address
      </h2>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Welcome to <strong style="color:#e2e8f0;">PhishGuard UK</strong>! To activate
        your account and start protecting yourself from phishing threats, enter the
        6-digit code below on the verification screen.
      </p>

      <!-- OTP digit boxes -->
      <table cellpadding="0" cellspacing="6" style="margin:0 auto 32px;">
        <tr>{digit_cells}</tr>
      </table>

      <!-- Expiry note -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:#0a0f1a;border:1px solid rgba(6,182,212,0.2);
                     border-radius:10px;padding:16px 20px;">
            <p style="color:#64748b;font-size:13px;margin:0;">
              ⏱ &nbsp;This code expires in
              <strong style="color:#94a3b8;">{settings.OTP_EXPIRE_MINUTES} minutes</strong>.
              After that, you will need to request a new code.
            </p>
          </td>
        </tr>
      </table>

      <!-- Security tip -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                     border-radius:10px;padding:16px 20px;">
            <p style="color:#f87171;font-size:13px;margin:0;">
              🔒 &nbsp;<strong>Security tip:</strong> PhishGuard UK will <em>never</em>
              call or message you to ask for this code. If anyone does, it is a phishing
              attempt — do not share it.
            </p>
          </td>
        </tr>
      </table>
    """

    plain = (
        f"PhishGuard UK — Email Verification\n"
        f"{'=' * 40}\n\n"
        f"Welcome! Your 6-digit verification code is:\n\n"
        f"  {otp}\n\n"
        f"This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
        f"If you did not create an account, please ignore this email.\n"
    )

    return await _send(to_email, subject, _html_shell(subject, body_html), plain)


# ── Template 2: Password Reset Link ───────────────────────────────────────────

async def send_password_reset_email(to_email: str, token: str) -> bool:
    """
    Send a password-reset deep-link email.
    The link points to the React frontend's /reset-password route.
    """
    reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}"
    subject   = "PhishGuard UK — Reset Your Password"

    body_html = f"""
      <!-- Heading -->
      <h2 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 8px;">
        Password Reset Request
      </h2>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 32px;">
        We received a request to reset the password for the
        <strong style="color:#e2e8f0;">{to_email}</strong> account.
        Click the button below to choose a new password.
      </p>

      <!-- CTA button -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
        <tr>
          <td style="border-radius:10px;
                     background:linear-gradient(135deg,#06b6d4,#0284c7);">
            <a href="{reset_url}"
               style="display:inline-block;padding:14px 36px;color:#ffffff;
                      font-size:15px;font-weight:700;text-decoration:none;
                      letter-spacing:0.3px;border-radius:10px;">
              Reset My Password &nbsp;→
            </a>
          </td>
        </tr>
      </table>

      <!-- Fallback link -->
      <p style="color:#64748b;font-size:12px;text-align:center;
                word-break:break-all;margin:0 0 24px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="{reset_url}"
           style="color:#06b6d4;text-decoration:underline;">{reset_url}</a>
      </p>

      <!-- Expiry notice -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#0a0f1a;border:1px solid rgba(6,182,212,0.2);
                     border-radius:10px;padding:16px 20px;">
            <p style="color:#64748b;font-size:13px;margin:0;">
              ⏱ &nbsp;This reset link is valid for
              <strong style="color:#94a3b8;">1 hour</strong>.
              After that, you will need to submit a new request.
            </p>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                     border-radius:10px;padding:16px 20px;">
            <p style="color:#f87171;font-size:13px;margin:0;">
              ⚠️ &nbsp;If you did not request a password reset, your account may be
              targeted. We recommend reviewing your recent login activity.
              This link will expire automatically and no changes have been made yet.
            </p>
          </td>
        </tr>
      </table>
    """

    plain = (
        f"PhishGuard UK — Password Reset\n"
        f"{'=' * 40}\n\n"
        f"A password reset was requested for: {to_email}\n\n"
        f"Click the link below to reset your password (valid for 1 hour):\n\n"
        f"  {reset_url}\n\n"
        f"If you did not request this, ignore this email. No changes have been made.\n"
    )

    return await _send(to_email, subject, _html_shell(subject, body_html), plain)


# ── Template 3: Password Successfully Changed ─────────────────────────────────

async def send_password_changed_email(to_email: str) -> bool:
    """
    Send a security-confirmation email immediately after a password is changed.
    This notifies the user so they can take action if the change was not made
    by them (e.g. account compromise).
    """
    subject  = "PhishGuard UK — Your Password Has Been Changed"
    now_str  = datetime.now(tz=timezone.utc).strftime("%d %B %Y at %H:%M UTC")
    login_url = f"{settings.FRONTEND_BASE_URL}/login"

    body_html = f"""
      <!-- Icon + heading -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td align="center">
            <div style="width:56px;height:56px;border-radius:50%;
                        background:linear-gradient(135deg,#10b981,#059669);
                        display:inline-flex;align-items:center;justify-content:center;
                        font-size:28px;line-height:56px;text-align:center;">
              ✓
            </div>
          </td>
        </tr>
      </table>

      <h2 style="color:#f1f5f9;font-size:24px;font-weight:700;
                 text-align:center;margin:0 0 8px;">
        Password Successfully Changed
      </h2>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;
                text-align:center;margin:0 0 32px;">
        Your <strong style="color:#e2e8f0;">PhishGuard UK</strong> account password
        was updated successfully.
      </p>

      <!-- Details card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:#0a0f1a;border:1px solid rgba(255,255,255,0.07);
                     border-radius:12px;padding:20px 24px;">

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;
                           border-bottom:1px solid rgba(255,255,255,0.05);">Account</td>
                <td align="right" style="color:#e2e8f0;font-size:13px;
                           font-weight:600;padding:6px 0;
                           border-bottom:1px solid rgba(255,255,255,0.05);">
                  {to_email}
                </td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Changed at</td>
                <td align="right" style="color:#e2e8f0;font-size:13px;
                           font-weight:600;padding:6px 0;">
                  {now_str}
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- Sign in button -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
        <tr>
          <td style="border-radius:10px;
                     background:linear-gradient(135deg,#06b6d4,#0284c7);">
            <a href="{login_url}"
               style="display:inline-block;padding:13px 32px;color:#ffffff;
                      font-size:14px;font-weight:700;text-decoration:none;
                      border-radius:10px;">
              Sign In to PhishGuard UK &nbsp;→
            </a>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                     border-radius:10px;padding:16px 20px;">
            <p style="color:#f87171;font-size:13px;margin:0;">
              🚨 &nbsp;<strong>Didn't make this change?</strong> Your account may be
              compromised. Use the "Forgot Password" link on the login page immediately
              to regain access, and contact your security team.
            </p>
          </td>
        </tr>
      </table>
    """

    plain = (
        f"PhishGuard UK — Password Changed\n"
        f"{'=' * 40}\n\n"
        f"Your password for {to_email} was successfully changed on {now_str}.\n\n"
        f"Sign in here: {login_url}\n\n"
        f"If you did NOT make this change, reset your password immediately at:\n"
        f"  {settings.FRONTEND_BASE_URL}/login\n"
        f"and contact your security team.\n"
    )

    return await _send(to_email, subject, _html_shell(subject, body_html), plain)
