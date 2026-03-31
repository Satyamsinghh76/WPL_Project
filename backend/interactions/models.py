from django.db import models

from accounts.models import PlatformUser
from posts.models import Post


class Vote(models.Model):
	UPVOTE = 1
	DOWNVOTE = -1
	VALUE_CHOICES = [
		(UPVOTE, 'Upvote'),
		(DOWNVOTE, 'Downvote'),
	]

	user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='votes')
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='votes')
	value = models.SmallIntegerField(choices=VALUE_CHOICES)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('user', 'post')

	def __str__(self):
		return f"{self.user.username} -> {self.post_id} ({self.value})"


class Report(models.Model):
	STATUS_PENDING = 'pending'
	STATUS_RESOLVED = 'resolved'
	STATUS_REJECTED = 'rejected'

	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pending'),
		(STATUS_RESOLVED, 'Resolved'),
		(STATUS_REJECTED, 'Rejected'),
	]

	reporter = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='reports')
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reports')
	reason = models.TextField()
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	created_at = models.DateTimeField(auto_now_add=True)
	reviewed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"Report #{self.id} - {self.status}"


class Comment(models.Model):
	author = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='comments')
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
	content = models.TextField()
	is_deleted = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['created_at']

	def __str__(self):
		return f"Comment {self.id} by {self.author.username}"
