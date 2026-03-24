from django.urls import path

from .views import role_options, users

urlpatterns = [
    path('roles/', role_options, name='role-options'),
    path('users/', users, name='users'),
]
