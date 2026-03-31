from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.auth import get_authenticated_user, parse_json_body
from accounts.models import PlatformUser
from posts.models import Post

from .models import Comment, Report, Vote


@csrf_exempt
def vote_on_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    payload = parse_json_body(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    value = payload.get('value')
    if value not in [Vote.UPVOTE, Vote.DOWNVOTE]:
        return JsonResponse({'detail': 'value (1 or -1) is required.'}, status=400)

    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if user.role == PlatformUser.ROLE_GENERAL:
        return JsonResponse({'detail': 'General users cannot vote. Upgrade to vote.', 'code': 'voting_not_allowed'}, status=403)

    Vote.objects.update_or_create(user=user, post=post, defaults={'value': value})
    score = Vote.objects.filter(post=post).aggregate(score=Sum('value'))['score'] or 0
    return JsonResponse({'post_id': post.id, 'score': score, 'user_vote': value})


@csrf_exempt
def report_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    payload = parse_json_body(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    reason = payload.get('reason', '').strip()
    if not reason:
        return JsonResponse({'detail': 'reason is required.'}, status=400)

    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if user.role == PlatformUser.ROLE_GENERAL:
        return JsonResponse({'detail': 'General users cannot submit reports.', 'code': 'report_not_allowed'}, status=403)

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


@csrf_exempt
def comments_collection(request, post_id):
    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if request.method == 'GET':
        comments = (
            Comment.objects.filter(post=post, is_deleted=False)
            .select_related('author')
            .values('id', 'content', 'created_at', 'updated_at', 'author_id', 'author__username')
        )
        return JsonResponse({'results': list(comments)})

    if request.method == 'POST':
        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)
        if actor.role == PlatformUser.ROLE_GENERAL:
            return JsonResponse({'detail': 'General users cannot comment.'}, status=403)

        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        content = (payload.get('content') or '').strip()
        if not content:
            return JsonResponse({'detail': 'content is required.'}, status=400)

        comment = Comment.objects.create(author=actor, post=post, content=content)
        return JsonResponse(
            {
                'id': comment.id,
                'content': comment.content,
                'created_at': comment.created_at.isoformat(),
                'updated_at': comment.updated_at.isoformat(),
                'author_id': actor.id,
                'author__username': actor.username,
            },
            status=201,
        )

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def comment_detail(request, comment_id):
    comment = Comment.objects.select_related('author').filter(id=comment_id, is_deleted=False).first()
    if not comment:
        return JsonResponse({'detail': 'Comment not found.'}, status=404)

    if request.method == 'DELETE':
        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)

        if actor.id != comment.author_id and actor.role not in [
            PlatformUser.ROLE_ADMIN,
            PlatformUser.ROLE_DEVELOPER,
            PlatformUser.ROLE_MODERATOR,
        ]:
            return JsonResponse({'detail': 'You do not have permission to delete this comment.'}, status=403)

        comment.is_deleted = True
        comment.save(update_fields=['is_deleted'])
        return JsonResponse({'detail': 'Comment deleted.'})

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)
