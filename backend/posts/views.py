import json

from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.models import PlatformUser
from interactions.models import Vote

from .models import Post, Topic


def _post_to_dict(post):
    vote_totals = Vote.objects.filter(post=post).aggregate(score=Sum('value'))
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
        'created_at': post.created_at.isoformat(),
        'updated_at': post.updated_at.isoformat(),
    }


@csrf_exempt
def posts_collection(request):
    if request.method == 'GET':
        queryset = Post.objects.filter(is_deleted=False).select_related('author', 'topic')
        return JsonResponse({'results': [_post_to_dict(post) for post in queryset]})

    if request.method == 'POST':
        try:
            payload = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        required_fields = ['author_id', 'title', 'content']
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            return JsonResponse({'detail': f"Missing fields: {', '.join(missing)}"}, status=400)

        try:
            author = PlatformUser.objects.get(id=payload['author_id'])
        except PlatformUser.DoesNotExist:
            return JsonResponse({'detail': 'Author not found.'}, status=404)

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
        return JsonResponse(_post_to_dict(post), status=201)

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def post_detail(request, post_id):
    post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_post_to_dict(post))

    if request.method in ['PUT', 'PATCH']:
        try:
            payload = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        for field in ['title', 'content', 'references']:
            if field in payload:
                setattr(post, field, payload[field])

        if 'topic_id' in payload:
            post.topic = Topic.objects.filter(id=payload['topic_id']).first()

        post.save()
        return JsonResponse(_post_to_dict(post))

    if request.method == 'DELETE':
        post.is_deleted = True
        post.save(update_fields=['is_deleted'])
        return JsonResponse({'detail': 'Post deleted.'})

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)
