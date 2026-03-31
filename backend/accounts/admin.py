from django.contrib import admin

from .models import AuthToken, PlatformUser


@admin.register(PlatformUser)
class PlatformUserAdmin(admin.ModelAdmin):
	list_display = ('id', 'username', 'email', 'role', 'is_active', 'created_at')
	list_filter = ('role', 'is_active')
	search_fields = ('username', 'email', 'full_name')


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'created_at', 'expires_at', 'is_revoked')
	list_filter = ('is_revoked',)
	search_fields = ('user__username', 'key')
