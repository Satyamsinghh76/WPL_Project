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
	CONTENT_TYPE_QUESTION = 'question'
	CONTENT_TYPE_THEORY = 'theory'
	CONTENT_TYPE_EXPERIMENT = 'experiment'
	CONTENT_TYPE_CLAIM = 'claim'
	CONTENT_TYPE_REVIEW = 'review'
	CONTENT_TYPE_CONCEPT = 'concept'
	CONTENT_TYPE_OTHER = 'other'

	CONTENT_TYPE_CHOICES = [
		(CONTENT_TYPE_QUESTION, 'Question'),
		(CONTENT_TYPE_THEORY, 'Theory'),
		(CONTENT_TYPE_EXPERIMENT, 'Experiment'),
		(CONTENT_TYPE_CLAIM, 'Claim'),
		(CONTENT_TYPE_REVIEW, 'Review'),
		(CONTENT_TYPE_CONCEPT, 'Concept (explained)'),
		(CONTENT_TYPE_OTHER, 'Other'),
	]

	author = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='posts', db_index=True)
	topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts', db_index=True)
	content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default=CONTENT_TYPE_OTHER, db_index=True)
	title = models.CharField(max_length=255)
	content = models.TextField()
	references = models.TextField(blank=True)
	media_items = models.JSONField(default=list, blank=True)
	is_deleted = models.BooleanField(default=False, db_index=True)
	is_hidden = models.BooleanField(default=False, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['author', '-created_at']),
			models.Index(fields=['-created_at', 'is_deleted']),
			models.Index(fields=['content_type', '-created_at'], name='posts_ct_created_idx'),
			models.Index(fields=['topic', 'content_type', '-created_at'], name='posts_topic_ct_created_idx'),
		]

	def __str__(self):
		return self.title
