from django.db import models


class Event(models.Model):
    TYPE_VISIT = 'visit'
    TYPE_LOGIN = 'login'
    TYPE_POST_CREATED = 'post_created'
    TYPE_VOTE = 'vote'
    TYPE_EVIDENCE_REVIEW = 'evidence_review'

    EVENT_TYPE_CHOICES = [
        (TYPE_VISIT, 'Visit'),
        (TYPE_LOGIN, 'Login'),
        (TYPE_POST_CREATED, 'Post Created'),
        (TYPE_VOTE, 'Vote'),
        (TYPE_EVIDENCE_REVIEW, 'Evidence Review'),
    ]

    user = models.ForeignKey(
        'accounts.PlatformUser',
        on_delete=models.SET_NULL,
        related_name='analytics_events',
        null=True,
        blank=True,
        db_index=True,
    )
    event_type = models.CharField(max_length=32, choices=EVENT_TYPE_CHOICES, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'event_type']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f'{self.event_type} @ {self.timestamp.isoformat()}'
