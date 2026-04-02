from django.urls import path

from .views import login, logout, me, oauth_callback, public_profile, role_options, switchable_roles, user_detail, users

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
]
