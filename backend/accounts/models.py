from django.db import models
from django.utils import timezone
import json
import secrets


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
	password_hash = models.CharField(max_length=255, blank=True)
	email = models.EmailField(unique=True)
	full_name = models.CharField(max_length=255)
	institution = models.CharField(max_length=255, blank=True)
	bio = models.TextField(blank=True)
	tagline = models.CharField(max_length=255, blank=True)
	skills = models.TextField(blank=True, help_text='Comma-separated skills')
	links = models.TextField(blank=True, help_text='JSON: {linkedin, github, website, gscholar, etc}')
	phone_number = models.CharField(max_length=20, blank=True)
	profile_picture = models.URLField(max_length=500, blank=True)
	supabase_id = models.CharField(max_length=255, blank=True, unique=True, null=True)
	role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_GENERAL)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"{self.username} ({self.role})"

	def get_links_dict(self):
		if not self.links:
			return {}
		try:
			return json.loads(self.links)
		except json.JSONDecodeError:
			return {}

	def set_links_dict(self, links_dict):
		self.links = json.dumps(links_dict) if links_dict else ''

	def get_skills_list(self):
		if not self.skills:
			return []
		return [s.strip() for s in self.skills.split(',') if s.strip()]

	def set_skills_list(self, skills_list):
		self.skills = ','.join(skills_list) if skills_list else ''


class AuthToken(models.Model):
	user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='tokens')
	key = models.CharField(max_length=64, unique=True, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()
	is_revoked = models.BooleanField(default=False)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"{self.user.username} token"

	@classmethod
	def issue_for_user(cls, user, ttl_hours=24):
		expires_at = timezone.now() + timezone.timedelta(hours=ttl_hours)
		return cls.objects.create(user=user, key=secrets.token_hex(32), expires_at=expires_at)

	def is_valid(self):
		return (not self.is_revoked) and self.expires_at > timezone.now()
