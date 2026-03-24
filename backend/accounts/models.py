from django.db import models


class PlatformUser(models.Model):
	ROLE_ADMIN = 'Administrator'
	ROLE_DEVELOPER = 'Developer'
	ROLE_MODERATOR = 'Moderator'
	ROLE_VERIFIED = 'Verified User'
	ROLE_GENERAL = 'General User'

	ROLE_CHOICES = [
		(ROLE_ADMIN, 'Administrator'),
		(ROLE_DEVELOPER, 'Developer'),
		(ROLE_MODERATOR, 'Moderator'),
		(ROLE_VERIFIED, 'Verified User'),
		(ROLE_GENERAL, 'General User'),
	]

	username = models.CharField(max_length=100, unique=True)
	email = models.EmailField(unique=True)
	full_name = models.CharField(max_length=255)
	institution = models.CharField(max_length=255, blank=True)
	bio = models.TextField(blank=True)
	role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_GENERAL)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"{self.username} ({self.role})"
