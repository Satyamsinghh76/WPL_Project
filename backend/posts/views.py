from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.auth import get_authenticated_user, parse_json_body
from accounts.models import PlatformUser
from interactions.models import Vote

from .models import Post, Topic


def _post_to_dict(post, viewer_id=None):
    vote_totals = Vote.objects.filter(post=post).aggregate(score=Sum('value'))
    user_vote = None
    if viewer_id:
        vote = Vote.objects.filter(post=post, user_id=viewer_id).values_list('value', flat=True).first()
        user_vote = vote

    return {
        'id': post.id,
        'title': post.title,
        'content': post.content,
        'references': post.references,
        'author_id': post.author_id,
        'author': post.author.username,
        'topic': post.topic.name if post.topic else None,
        'topic_id': post.topic_id,
        'score': vote_totals['score'] or 0,
        'user_vote': user_vote,
        'created_at': post.created_at.isoformat(),
        'updated_at': post.updated_at.isoformat(),
    }


def _is_privileged(user):
    return user and user.role in {
        PlatformUser.ROLE_ADMIN,
        PlatformUser.ROLE_DEVELOPER,
        PlatformUser.ROLE_MODERATOR,
        PlatformUser.ROLE_VERIFIED,
    }


@csrf_exempt
def topics_collection(request):
    if request.method == 'GET':
        topics = Topic.objects.select_related('parent').all()
        return JsonResponse(
            {
                'results': [
                    {
                        'id': topic.id,
                        'name': topic.name,
                        'parent_id': topic.parent_id,
                        'parent_name': topic.parent.name if topic.parent else None,
                    }
                    for topic in topics
                ]
            }
        )

    if request.method == 'POST':
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        actor = get_authenticated_user(request)
        if not actor or actor.role != PlatformUser.ROLE_ADMIN:
            return JsonResponse({'detail': 'Only administrators can create topics.'}, status=403)

        name = (payload.get('name') or '').strip()
        if not name:
            return JsonResponse({'detail': 'Topic name is required.'}, status=400)

        parent = None
        parent_id = payload.get('parent_id')
        if parent_id:
            parent = Topic.objects.filter(id=parent_id).first()
            if not parent:
                return JsonResponse({'detail': 'Parent topic not found.'}, status=404)

        topic, created = Topic.objects.get_or_create(name=name, defaults={'parent': parent})
        if not created:
            return JsonResponse({'detail': 'Topic already exists.'}, status=400)

        return JsonResponse(
            {
                'id': topic.id,
                'name': topic.name,
                'parent_id': topic.parent_id,
                'parent_name': topic.parent.name if topic.parent else None,
            },
            status=201,
        )

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def posts_collection(request):
    if request.method == 'GET':
        viewer_id = request.GET.get('viewer_id')
        queryset = Post.objects.filter(is_deleted=False).select_related('author', 'topic')
        return JsonResponse({'results': [_post_to_dict(post, viewer_id=viewer_id) for post in queryset]})

    if request.method == 'POST':
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        required_fields = ['title', 'content']
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            return JsonResponse({'detail': f"Missing fields: {', '.join(missing)}"}, status=400)

        author = get_authenticated_user(request)
        if not author:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)

        if not _is_privileged(author):
            return JsonResponse({'detail': 'Your role is read-only and cannot create posts.'}, status=403)

        topic = None
        topic_id = payload.get('topic_id')
        if topic_id:
            topic = Topic.objects.filter(id=topic_id).first()

        post = Post.objects.create(
            author=author,
            topic=topic,
            title=payload['title'],
            content=payload['content'],
            references=payload.get('references', ''),
        )
        return JsonResponse(_post_to_dict(post, viewer_id=author.id), status=201)

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def post_detail(request, post_id):
    post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if request.method == 'GET':
        viewer_id = request.GET.get('viewer_id')
        return JsonResponse(_post_to_dict(post, viewer_id=viewer_id))

    if request.method in ['PUT', 'PATCH']:
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)
        if actor.id != post.author_id and actor.role not in {
            PlatformUser.ROLE_ADMIN,
            PlatformUser.ROLE_DEVELOPER,
            PlatformUser.ROLE_MODERATOR,
        }:
            return JsonResponse({'detail': 'You do not have permission to edit this post.'}, status=403)

        for field in ['title', 'content', 'references']:
            if field in payload:
                setattr(post, field, payload[field])

        if 'topic_id' in payload:
            post.topic = Topic.objects.filter(id=payload['topic_id']).first()

        post.save()
        return JsonResponse(_post_to_dict(post, viewer_id=actor.id))

    if request.method == 'DELETE':
        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)
        if actor.id != post.author_id and actor.role not in {
            PlatformUser.ROLE_ADMIN,
            PlatformUser.ROLE_DEVELOPER,
            PlatformUser.ROLE_MODERATOR,
        }:
            return JsonResponse({'detail': 'You do not have permission to delete this post.'}, status=403)

        post.is_deleted = True
        post.save(update_fields=['is_deleted'])
        return JsonResponse({'detail': 'Post deleted.'})

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)
