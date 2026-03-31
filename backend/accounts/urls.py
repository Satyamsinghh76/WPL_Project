from django.urls import path

from .views import login, logout, role_options, user_detail, users

urlpatterns = [
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('roles/', role_options, name='role-options'),
    path('users/', users, name='users'),
    path('users/<int:user_id>/', user_detail, name='user-detail'),
]
