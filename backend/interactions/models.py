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

	user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='votes', db_index=True)
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='votes', db_index=True)
	value = models.SmallIntegerField(choices=VALUE_CHOICES)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('user', 'post')
		indexes = [
			models.Index(fields=['post']),
		]

	def __str__(self):
		return f"{self.user.username} -> {self.post_id} ({self.value})"


class Report(models.Model):
	TARGET_POST = 'post'
	TARGET_USER = 'user'
	TARGET_CHOICES = [
		(TARGET_POST, 'Post'),
		(TARGET_USER, 'User'),
	]

	STATUS_PENDING = 'pending'
	STATUS_RESOLVED = 'resolved'
	STATUS_REJECTED = 'rejected'

	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pending'),
		(STATUS_RESOLVED, 'Resolved'),
		(STATUS_REJECTED, 'Rejected'),
	]

	reporter = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='reports', db_index=True)
	target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default=TARGET_POST, db_index=True)
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reports', null=True, blank=True, db_index=True)
	reported_user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='reported_accounts', null=True, blank=True, db_index=True)
	reason = models.TextField()
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)
	reviewed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['-created_at', 'status']),
		]

	def __str__(self):
		return f"Report #{self.id} - {self.target_type} - {self.status}"


class Comment(models.Model):
	author = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='comments', db_index=True)
	post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments', db_index=True)
	content = models.TextField()
	is_deleted = models.BooleanField(default=False, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['created_at']
		indexes = [
			models.Index(fields=['post', '-created_at']),
		]

	def __str__(self):
		return f"Comment {self.id} by {self.author.username}"


class CommentVote(models.Model):
	UPVOTE = 1
	DOWNVOTE = -1
	VALUE_CHOICES = [
		(UPVOTE, 'Upvote'),
		(DOWNVOTE, 'Downvote'),
	]

	user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='comment_votes', db_index=True)
	comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='votes', db_index=True)
	value = models.SmallIntegerField(choices=VALUE_CHOICES)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('user', 'comment')
		indexes = [
			models.Index(fields=['comment']),
		]

	def __str__(self):
		return f'{self.user.username} -> comment {self.comment_id} ({self.value})'


class Conversation(models.Model):
	TYPE_DIRECT = 'direct'
	TYPE_GROUP = 'group'
	TYPE_TOPIC = 'topic'
	TYPE_CHOICES = [
		(TYPE_DIRECT, 'Direct Message'),
		(TYPE_GROUP, 'Group Chat'),
		(TYPE_TOPIC, 'Topic Room'),
	]

	name = models.CharField(max_length=255, blank=True)
	conv_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_DIRECT)
	topic = models.OneToOneField(
		'posts.Topic', null=True, blank=True, on_delete=models.CASCADE, related_name='chat_room'
	)
	created_by = models.ForeignKey(
		PlatformUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_conversations'
	)
	updated_at = models.DateTimeField(auto_now=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-updated_at']

	def __str__(self):
		if self.conv_type == self.TYPE_DIRECT:
			members = self.members.select_related('user').all()
			names = [m.user.username for m in members]
			return f"DM: {' <-> '.join(names)}"
		return f"{self.get_conv_type_display()}: {self.name}"


class ConversationMember(models.Model):
	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='members')
	user = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='chat_memberships')
	last_read_at = models.DateTimeField(null=True, blank=True)
	joined_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('conversation', 'user')

	def __str__(self):
		return f"{self.user.username} in {self.conversation_id}"


class Message(models.Model):
	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
	sender = models.ForeignKey(PlatformUser, on_delete=models.CASCADE, related_name='sent_messages')
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['created_at']

	def __str__(self):
		return f"Message {self.id} from {self.sender.username}"
