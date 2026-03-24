import json

from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.models import PlatformUser
from posts.models import Post

from .models import Report, Vote


@csrf_exempt
def vote_on_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user_id = payload.get('user_id')
    value = payload.get('value')
    if not user_id or value not in [Vote.UPVOTE, Vote.DOWNVOTE]:
        return JsonResponse({'detail': 'user_id and value (1 or -1) are required.'}, status=400)

    user = PlatformUser.objects.filter(id=user_id).first()
    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not user or not post:
        return JsonResponse({'detail': 'User or post not found.'}, status=404)

    Vote.objects.update_or_create(user=user, post=post, defaults={'value': value})
    score = Vote.objects.filter(post=post).aggregate(score=Sum('value'))['score'] or 0
    return JsonResponse({'post_id': post.id, 'score': score})


@csrf_exempt
def report_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user_id = payload.get('user_id')
    reason = payload.get('reason', '').strip()
    if not user_id or not reason:
        return JsonResponse({'detail': 'user_id and reason are required.'}, status=400)

    user = PlatformUser.objects.filter(id=user_id).first()
    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not user or not post:
        return JsonResponse({'detail': 'User or post not found.'}, status=404)

    report = Report.objects.create(reporter=user, post=post, reason=reason)
    return JsonResponse({'id': report.id, 'status': report.status}, status=201)


def reports_collection(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    reports = Report.objects.select_related('reporter', 'post').all().values(
        'id',
        'status',
        'reason',
        'created_at',
        'reporter_id',
        'reporter__username',
        'post_id',
        'post__title',
    )
    return JsonResponse({'results': list(reports)})
