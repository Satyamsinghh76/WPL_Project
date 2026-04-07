from django.urls import path

from .views import (
    change_password, forgot_password, login, logout, me, oauth_callback,
    public_profile, reset_password, role_options, send_verification,
    switchable_roles, user_detail, users, verify_email,
    upload_profile_picture,
)

urlpatterns = [
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('oauth/callback/', oauth_callback, name='oauth-callback'),
    path('me/', me, name='me'),
    path('public/<str:username>/', public_profile, name='public-profile'),
    path('roles/', role_options, name='role-options'),
    path('switchable-roles/', switchable_roles, name='switchable-roles'),
    path('users/', users, name='users'),
    path('users/<int:user_id>/', user_detail, name='user-detail'),
    path('send-verification/', send_verification, name='send-verification'),
    path('verify-email/', verify_email, name='verify-email'),
    path('upload-profile-picture/', upload_profile_picture, name='upload-profile-picture'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/', reset_password, name='reset-password'),
    path('change-password/', change_password, name='change-password'),
]
