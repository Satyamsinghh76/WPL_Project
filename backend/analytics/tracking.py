import logging

from .models import Event


logger = logging.getLogger(__name__)


def track_event(event_type, user=None, metadata=None):
    try:
        Event.objects.create(
            user=user,
            event_type=event_type,
            metadata=metadata or None,
        )
    except Exception:
        logger.exception('Failed to persist analytics event: %s', event_type)
