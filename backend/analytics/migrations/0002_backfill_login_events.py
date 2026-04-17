from django.db import migrations


def backfill_login_events(apps, schema_editor):
    AuthToken = apps.get_model('accounts', 'AuthToken')
    Event = apps.get_model('analytics', 'Event')

    earliest_tracked_login = Event.objects.filter(event_type='login').order_by('timestamp').values_list('timestamp', flat=True).first()

    token_qs = AuthToken.objects.select_related('user').order_by('created_at')
    if earliest_tracked_login is not None:
        token_qs = token_qs.filter(created_at__lt=earliest_tracked_login)

    events_to_create = []
    for token in token_qs:
        if not token.user_id:
            continue
        events_to_create.append(
            Event(
                user_id=token.user_id,
                event_type='login',
                timestamp=token.created_at,
                metadata={
                    'method': 'backfill_auth_token',
                    'auth_token_id': token.id,
                    'token_created_at': token.created_at.isoformat(),
                },
            )
        )

    if events_to_create:
        Event.objects.bulk_create(events_to_create, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0001_initial'),
        ('accounts', '0002_platformuser_password_hash_authtoken'),
    ]

    operations = [
        migrations.RunPython(backfill_login_events, migrations.RunPython.noop),
    ]