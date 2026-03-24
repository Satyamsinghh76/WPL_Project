from django.contrib import admin

from .models import PlatformUser


@admin.register(PlatformUser)
class PlatformUserAdmin(admin.ModelAdmin):
	list_display = ('id', 'username', 'email', 'role', 'is_active', 'created_at')
	list_filter = ('role', 'is_active')
	search_fields = ('username', 'email', 'full_name')
