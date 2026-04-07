from django.conf import settings
from django.core.mail import send_mail


def _frontend_url():
    return settings.FRONTEND_URL.rstrip('/')


def send_verification_email(user, token):
    link = f'{_frontend_url()}/verify-email?token={token.key}'
    send_mail(
        subject='Verify your Scholr email',
        message=(
            f'Hi {user.full_name},\n\n'
            f'Please verify your email by clicking the link below:\n\n'
            f'{link}\n\n'
            f'This link expires in 24 hours.\n\n'
            f'— Scholr'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_password_reset_email(user, token):
    link = f'{_frontend_url()}/reset-password?token={token.key}'
    send_mail(
        subject='Reset your Scholr password',
        message=(
            f'Hi {user.full_name},\n\n'
            f'You requested a password reset. Click the link below to set a new password:\n\n'
            f'{link}\n\n'
            f'This link expires in 1 hour. If you did not request this, ignore this email.\n\n'
            f'— Scholr'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_welcome_email(user, needs_verification=True):
    link = f'{_frontend_url()}/login'
    if needs_verification:
        body = (
            f'Hi {user.full_name},\n\n'
            f'Welcome to Scholr — your academic discussion platform.\n\n'
            f'Your account has been created with the username: {user.username}\n\n'
            f'Please verify your email to unlock full access (create posts, vote, comment).\n'
            f'Check your inbox for a verification link.\n\n'
            f'Log in here: {link}\n\n'
            f'— Scholr'
        )
    else:
        body = (
            f'Hi {user.full_name},\n\n'
            f'Welcome to Scholr — your academic discussion platform.\n\n'
            f'Your account has been created via Google/LinkedIn with the username: {user.username}\n'
            f'Your email ({user.email}) is already verified.\n\n'
            f'You can now create posts, vote, and participate in discussions.\n\n'
            f'Log in here: {link}\n\n'
            f'— Scholr'
        )
    send_mail(
        subject='Welcome to Scholr!',
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )