from django.db import models

from accounts.models import PlatformUser


class Topic(models.Model):
	name = models.CharField(max_length=120, unique=True, db_index=True)
	parent = models.ForeignKey(
		'self',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='subtopics',
	)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)

	class Meta:
		ordering = ['name']

	def __str__(self):
		return self.name


class Post(models.Model):
	author = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='posts', db_index=True)
	topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts', db_index=True)
	title = models.CharField(max_length=255)
	content = models.TextField()
	references = models.TextField(blank=True)
	is_deleted = models.BooleanField(default=False, db_index=True)
	is_hidden = models.BooleanField(default=False, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['author', '-created_at']),
			models.Index(fields=['-created_at', 'is_deleted']),
		]

	def __str__(self):
		return self.title
