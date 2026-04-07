import json
import logging
from email.utils import parseaddr
from urllib import error, request

from django.conf import settings


logger = logging.getLogger(__name__)


def _send_email(to_email, subject, text_body, html_body):
    if not settings.BREVO_API_KEY:
        logger.error('BREVO_API_KEY is not configured; cannot send email to=%s subject=%s', to_email, subject)
        return False

    sender_name, sender_email = parseaddr(settings.DEFAULT_FROM_EMAIL)
    if not sender_email:
        logger.error('DEFAULT_FROM_EMAIL must include a valid email address for Brevo. Current value=%s', settings.DEFAULT_FROM_EMAIL)
        return False

    payload = {
        'sender': {
            'name': sender_name or 'Scholr',
            'email': sender_email,
        },
        'to': [{'email': to_email}],
        'subject': subject,
        'htmlContent': html_body,
        'textContent': text_body,
    }

    req = request.Request(
        'https://api.brevo.com/v3/smtp/email',
        data=json.dumps(payload).encode('utf-8'),
        method='POST',
        headers={
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': settings.BREVO_API_KEY,
        },
    )

    try:
        with request.urlopen(req, timeout=12) as resp:
            return 200 <= resp.status < 300
    except error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='ignore')
        logger.error('Brevo email send HTTP %s to=%s subject=%s body=%s', exc.code, to_email, subject, body)
        return False
    except Exception:
        logger.exception('Brevo email send failed to=%s subject=%s from=%s', to_email, subject, settings.DEFAULT_FROM_EMAIL)
        return False


def _frontend_url():
    return settings.FRONTEND_URL.rstrip('/')


def send_verification_email(user, token):
    link = f'{_frontend_url()}/verify-email?token={token.key}'
    text_body = (
        f'Hi {user.full_name},\n\n'
        f'Please verify your email by clicking the link below:\n\n'
        f'{link}\n\n'
        f'This link expires in 24 hours.\n\n'
        f'- Scholr'
    )
    html_body = (
        f'<p>Hi {user.full_name},</p>'
        f'<p>Please verify your email by clicking the link below:</p>'
        f'<p><a href="{link}">{link}</a></p>'
        f'<p>This link expires in 24 hours.</p>'
        f'<p>- Scholr</p>'
    )
    return _send_email(user.email, 'Verify your Scholr email', text_body, html_body)


def send_password_reset_email(user, token):
    link = f'{_frontend_url()}/reset-password?token={token.key}'
    text_body = (
        f'Hi {user.full_name},\n\n'
        f'You requested a password reset. Click the link below to set a new password:\n\n'
        f'{link}\n\n'
        f'This link expires in 1 hour. If you did not request this, ignore this email.\n\n'
        f'- Scholr'
    )
    html_body = (
        f'<p>Hi {user.full_name},</p>'
        f'<p>You requested a password reset. Click the link below to set a new password:</p>'
        f'<p><a href="{link}">{link}</a></p>'
        f'<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>'
        f'<p>- Scholr</p>'
    )
    return _send_email(user.email, 'Reset your Scholr password', text_body, html_body)


def send_welcome_email(user, needs_verification=True):
    link = f'{_frontend_url()}/login'
    if needs_verification:
        text_body = (
            f'Hi {user.full_name},\n\n'
            f'Welcome to Scholr — your academic discussion platform.\n\n'
            f'Your account has been created with the username: {user.username}\n\n'
            f'Please verify your email to unlock full access (create posts, vote, comment).\n'
            f'Check your inbox for a verification link.\n\n'
            f'Log in here: {link}\n\n'
            f'- Scholr'
        )
        html_body = (
            f'<p>Hi {user.full_name},</p>'
            f'<p>Welcome to Scholr - your academic discussion platform.</p>'
            f'<p>Your account has been created with the username: <strong>{user.username}</strong></p>'
            f'<p>Please verify your email to unlock full access (create posts, vote, comment). '
            f'Check your inbox for a verification link.</p>'
            f'<p>Log in here: <a href="{link}">{link}</a></p>'
            f'<p>- Scholr</p>'
        )
    else:
        text_body = (
            f'Hi {user.full_name},\n\n'
            f'Welcome to Scholr — your academic discussion platform.\n\n'
            f'Your account has been created via Google/LinkedIn with the username: {user.username}\n'
            f'Your email ({user.email}) is already verified.\n\n'
            f'You can now create posts, vote, and participate in discussions.\n\n'
            f'Log in here: {link}\n\n'
            f'- Scholr'
        )
        html_body = (
            f'<p>Hi {user.full_name},</p>'
            f'<p>Welcome to Scholr - your academic discussion platform.</p>'
            f'<p>Your account has been created via Google/LinkedIn with the username: '
            f'<strong>{user.username}</strong></p>'
            f'<p>Your email ({user.email}) is already verified.</p>'
            f'<p>You can now create posts, vote, and participate in discussions.</p>'
            f'<p>Log in here: <a href="{link}">{link}</a></p>'
            f'<p>- Scholr</p>'
        )
    return _send_email(user.email, 'Welcome to Scholr!', text_body, html_body)