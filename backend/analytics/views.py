import json
from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from accounts.auth import get_authenticated_user, get_effective_role
from accounts.models import PlatformUser

from .models import Event
from .tracking import track_event


def _window_start(range_value):
    now = timezone.now()
    if range_value == 'daily':
        return now - timedelta(days=30)
    if range_value == 'weekly':
        return now - timedelta(weeks=26)
    return now - timedelta(days=365)


def _range_config(range_value):
    if range_value == 'daily':
        return TruncDate, _window_start('daily')
    if range_value == 'weekly':
        return TruncWeek, _window_start('weekly')
    if range_value == 'monthly':
        return TruncMonth, _window_start('monthly')
    return None, None


def _format_bucket_date(value):
    if hasattr(value, 'date'):
        return value.date().isoformat()
    return value.isoformat()


def _require_admin(request):
    actor = get_authenticated_user(request)
    if not actor:
        return None, JsonResponse({'detail': 'Authentication required.'}, status=401)

    actor_role = get_effective_role(request, actor)
    if actor_role != PlatformUser.ROLE_ADMIN:
        return None, JsonResponse({'detail': 'Admin access required.'}, status=403)

    return actor, None


@csrf_exempt
def analytics_timeseries(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    _, auth_error = _require_admin(request)
    if auth_error:
        return auth_error

    range_value = (request.GET.get('range') or 'daily').strip().lower()
    trunc_fn, start_at = _range_config(range_value)
    if trunc_fn is None:
        return JsonResponse({'detail': 'range must be one of daily, weekly, monthly.'}, status=400)

    queryset = Event.objects.filter(timestamp__gte=start_at)

    rows = (
        queryset.annotate(period=trunc_fn('timestamp'))
        .values('period')
        .annotate(
            visits=Count('id', filter=Q(event_type=Event.TYPE_VISIT)),
            logins=Count('id', filter=Q(event_type=Event.TYPE_LOGIN)),
            posts=Count('id', filter=Q(event_type=Event.TYPE_POST_CREATED)),
            votes=Count('id', filter=Q(event_type=Event.TYPE_VOTE)),
            evidence_reviews=Count('id', filter=Q(event_type=Event.TYPE_EVIDENCE_REVIEW)),
        )
        .order_by('period')
    )

    payload = [
        {
            'date': _format_bucket_date(item['period']),
            'visits': item['visits'],
            'logins': item['logins'],
            'posts': item['posts'],
            'votes': item['votes'],
            'evidence_reviews': item['evidence_reviews'],
        }
        for item in rows
    ]
    return JsonResponse(payload, safe=False)


@csrf_exempt
def top_contributors(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    _, auth_error = _require_admin(request)
    if auth_error:
        return auth_error

    range_value = (request.GET.get('range') or 'monthly').strip().lower()
    _, start_at = _range_config(range_value)
    if start_at is None:
        return JsonResponse({'detail': 'range must be one of daily, weekly, monthly.'}, status=400)

    try:
        limit = max(1, min(int(request.GET.get('limit', 5)), 20))
    except (TypeError, ValueError):
        limit = 5

    rows = (
        Event.objects.filter(timestamp__gte=start_at, user__isnull=False)
        .values('user_id', 'user__username')
        .annotate(
            posts=Count('id', filter=Q(event_type=Event.TYPE_POST_CREATED)),
            votes=Count('id', filter=Q(event_type=Event.TYPE_VOTE)),
            evidence_reviews=Count('id', filter=Q(event_type=Event.TYPE_EVIDENCE_REVIEW)),
            visits=Count('id', filter=Q(event_type=Event.TYPE_VISIT)),
            logins=Count('id', filter=Q(event_type=Event.TYPE_LOGIN)),
            total_activity=Count('id'),
        )
        .order_by('-total_activity', 'user__username')[:limit]
    )

    data = []
    for row in rows:
        thinking_score = row['posts'] + row['votes'] + row['evidence_reviews']
        data.append(
            {
                'user_id': row['user_id'],
                'username': row['user__username'],
                'posts': row['posts'],
                'votes': row['votes'],
                'evidence_reviews': row['evidence_reviews'],
                'visits': row['visits'],
                'logins': row['logins'],
                'thinking_score': thinking_score,
                'total_activity': row['total_activity'],
            }
        )

    return JsonResponse({'results': data})


@csrf_exempt
def analytics_summary(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    _, auth_error = _require_admin(request)
    if auth_error:
        return auth_error

    range_value = (request.GET.get('range') or 'daily').strip().lower()
    _, start_at = _range_config(range_value)
    if start_at is None:
        return JsonResponse({'detail': 'range must be one of daily, weekly, monthly.'}, status=400)

    in_range = Event.objects.filter(timestamp__gte=start_at)
    all_events = Event.objects.all()
    all_visits = all_events.filter(event_type=Event.TYPE_VISIT)

    summary = {
        'range': range_value,
        'visits': in_range.filter(event_type=Event.TYPE_VISIT).count(),
        'logins': in_range.filter(event_type=Event.TYPE_LOGIN).count(),
        'posts': in_range.filter(event_type=Event.TYPE_POST_CREATED).count(),
        'votes': in_range.filter(event_type=Event.TYPE_VOTE).count(),
        'evidence_reviews': in_range.filter(event_type=Event.TYPE_EVIDENCE_REVIEW).count(),
        'thinking_score': (
            in_range.filter(event_type=Event.TYPE_POST_CREATED).count()
            + in_range.filter(event_type=Event.TYPE_VOTE).count()
            + in_range.filter(event_type=Event.TYPE_EVIDENCE_REVIEW).count()
        ),
        'total_visits_all_time': all_visits.count(),
        'known_visitor_accounts_all_time': (
            all_visits.filter(user__isnull=False).values('user_id').distinct().count()
        ),
        'anonymous_visits_all_time': all_visits.filter(user__isnull=True).count(),
        'login_sessions_all_time': Event.objects.filter(event_type=Event.TYPE_LOGIN).count(),
        'unique_login_users_all_time': Event.objects.filter(event_type=Event.TYPE_LOGIN).values('user_id').distinct().count(),
    }

    return JsonResponse(summary)


@csrf_exempt
def track_visit(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    actor = get_authenticated_user(request)

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        payload = {}

    metadata = {
        'page': str(payload.get('page') or '/analytics')[:200],
        'source': str(payload.get('source') or 'frontend_ping')[:100],
        'referrer': str(payload.get('referrer') or request.META.get('HTTP_REFERER') or '')[:500],
        'user_agent': str(request.META.get('HTTP_USER_AGENT') or '')[:500],
    }

    track_event(Event.TYPE_VISIT, user=actor, metadata=metadata)
    return JsonResponse({'ok': True}, status=201)
