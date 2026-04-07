from django.db.models import Sum, Prefetch, Q, F, IntegerField
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_page
from django.core.paginator import Paginator

from accounts.auth import get_authenticated_user, get_effective_role, parse_json_body
from accounts.models import PlatformUser
from interactions.models import Vote

from .models import Post, Topic


def _post_to_dict(post, user_votes_by_post_id=None, vote_scores_by_post_id=None):
	"""Convert post to dict. Uses pre-fetched vote data to avoid N+1 queries."""
	user_vote = None
	if user_votes_by_post_id and post.id in user_votes_by_post_id:
		user_vote = user_votes_by_post_id[post.id]
	
	score = 0
	if vote_scores_by_post_id and post.id in vote_scores_by_post_id:
		score = vote_scores_by_post_id[post.id] or 0

	return {
		'id': post.id,
		'title': post.title,
		'content': post.content,
		'references': post.references,
		'author_id': post.author_id,
		'author': post.author.username,
		'topic': post.topic.name if post.topic else None,
		'topic_id': post.topic_id,
		'is_hidden': post.is_hidden,
		'score': score,
		'user_vote': user_vote,
		'created_at': post.created_at.isoformat(),
		'updated_at': post.updated_at.isoformat(),
	}


def _is_privileged_role(role):
    return role in {
        PlatformUser.ROLE_ADMIN,
        PlatformUser.ROLE_DEVELOPER,
        PlatformUser.ROLE_MODERATOR,
        PlatformUser.ROLE_VERIFIED,
    }


def _can_moderate_posts(role):
	return role in {
		PlatformUser.ROLE_ADMIN,
		PlatformUser.ROLE_DEVELOPER,
		PlatformUser.ROLE_MODERATOR,
	}


def search_all(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	query = (request.GET.get('q') or '').strip()
	if len(query) < 2:
		return JsonResponse({'topics': [], 'posts': [], 'users': []})

	actor = get_authenticated_user(request)
	actor_role = get_effective_role(request, actor)
	can_view_hidden = _can_moderate_posts(actor_role)

	topics = Topic.objects.filter(name__icontains=query).order_by('name')[:8]

	posts_qs = Post.objects.filter(is_deleted=False, title__icontains=query).select_related('author', 'topic').order_by('-created_at')
	if not can_view_hidden:
		posts_qs = posts_qs.filter(is_hidden=False)
	posts_qs = posts_qs[:8]

	users = PlatformUser.objects.filter(is_active=True).filter(
		Q(username__icontains=query) | Q(full_name__icontains=query)
	).order_by('username')[:8]

	return JsonResponse(
		{
			'topics': [{'id': t.id, 'name': t.name, 'parent_id': t.parent_id} for t in topics],
			'posts': [
				{
					'id': p.id,
					'title': p.title,
					'author': p.author.username,
					'topic': p.topic.name if p.topic else None,
				}
				for p in posts_qs
			],
			'users': [
				{
					'id': u.id,
					'username': u.username,
					'full_name': u.full_name,
					'profile_picture': u.profile_picture,
				}
				for u in users
			],
		}
	)


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
        actor_role = get_effective_role(request, actor)
        if not actor or actor_role != PlatformUser.ROLE_ADMIN:
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
		actor = get_authenticated_user(request)
		actor_role = get_effective_role(request, actor)
		can_view_hidden = _can_moderate_posts(actor_role)
		viewer_id = request.GET.get('viewer_id')
		page_num = request.GET.get('page', 1)
		sort_by = (request.GET.get('sort', 'new') or 'new').lower()  # 'new' or 'hot'
		topic_id = request.GET.get('topic_id')
		
		# Build queryset with filters
		queryset = Post.objects.filter(is_deleted=False).select_related('author', 'topic')
		if not can_view_hidden:
			queryset = queryset.filter(is_hidden=False)
		
		# Filter by topic if provided
		if topic_id:
			try:
				topic_id = int(topic_id)
				queryset = queryset.filter(topic_id=topic_id)
			except (ValueError, TypeError):
				pass  # Invalid topic_id, ignore filter
		
		# Apply sorting
		if sort_by == 'hot':
			# Sort by score (votes), treating NULL as 0 so unvoted posts do not float to top.
			queryset = queryset.annotate(
				score=Coalesce(Sum('votes__value'), 0, output_field=IntegerField())
			).order_by('-score', '-created_at')
		else:
			sort_by = 'new'
			# Default: sort by newest (uses index: (-created_at, is_deleted))
			queryset = queryset.order_by('-created_at')
		
		# Paginate: 20 posts per page
		paginator = Paginator(queryset, 20)
		try:
			page = paginator.get_page(page_num)
		except:
			page = paginator.get_page(1)
		
		posts = page.object_list
		post_ids = [p.id for p in posts]
		
		# Pre-fetch ALL vote data in single queries
		vote_scores = {}
		user_votes = {}
		
		if post_ids:
			vote_scores_data = Vote.objects.filter(post_id__in=post_ids).values('post_id').annotate(score=Sum('value'))
			vote_scores = {v['post_id']: v['score'] for v in vote_scores_data}
			
			if viewer_id:
				user_votes_data = Vote.objects.filter(post_id__in=post_ids, user_id=viewer_id).values_list('post_id', 'value')
				user_votes = {post_id: value for post_id, value in user_votes_data}
		
		results = [_post_to_dict(post, user_votes_by_post_id=user_votes, vote_scores_by_post_id=vote_scores) for post in posts]
		
		return JsonResponse({
			'results': results,
			'count': paginator.count,
			'page': page.number,
			'total_pages': paginator.num_pages,
			'sort': sort_by,
			'topic_id': topic_id,
		})

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

		author_role = get_effective_role(request, author)
		if not _is_privileged_role(author_role):
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
		# Refresh from DB to get related data
		post.refresh_from_db()
		post = Post.objects.filter(id=post.id).select_related('author', 'topic').first()
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id={}, vote_scores_by_post_id={}), status=201)

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def post_detail(request, post_id):
	actor = get_authenticated_user(request)
	actor_role = get_effective_role(request, actor)
	can_view_hidden = _can_moderate_posts(actor_role)

	queryset = Post.objects.filter(id=post_id, is_deleted=False)
	if not can_view_hidden:
		queryset = queryset.filter(is_hidden=False)
	post = queryset.select_related('author', 'topic').first()
	if not post:
		return JsonResponse({'detail': 'Post not found.'}, status=404)

	if request.method == 'GET':
		viewer_id = request.GET.get('viewer_id')
		# Get vote data for this single post
		vote_score = Vote.objects.filter(post_id=post.id).aggregate(score=Sum('value'))['score'] or 0
		user_vote = None
		if viewer_id:
			user_vote = Vote.objects.filter(post_id=post.id, user_id=viewer_id).values_list('value', flat=True).first()
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id={post.id: user_vote} if user_vote else {}, vote_scores_by_post_id={post.id: vote_score}))

	if request.method in ['PUT', 'PATCH']:
		payload = parse_json_body(request)
		if payload is None:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		actor_role = get_effective_role(request, actor)
		if actor.id != post.author_id and actor_role not in {
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
		post.refresh_from_db()
		post = Post.objects.filter(id=post.id).select_related('author', 'topic').first()
		vote_score = Vote.objects.filter(post_id=post.id).aggregate(score=Sum('value'))['score'] or 0
		user_vote = Vote.objects.filter(post_id=post.id, user_id=actor.id).values_list('value', flat=True).first()
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id={post.id: user_vote} if user_vote else {}, vote_scores_by_post_id={post.id: vote_score}))

	if request.method == 'DELETE':
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		if actor.id != post.author_id and actor_role not in {
			PlatformUser.ROLE_ADMIN,
			PlatformUser.ROLE_DEVELOPER,
			PlatformUser.ROLE_MODERATOR,
		}:
			return JsonResponse({'detail': 'You do not have permission to delete this post.'}, status=403)
		post.delete()
		return JsonResponse({'detail': 'Post deleted permanently.'})

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def post_visibility(request, post_id):
	post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
	if not post:
		return JsonResponse({'detail': 'Post not found.'}, status=404)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)
	actor_role = get_effective_role(request, actor)
	if not _can_moderate_posts(actor_role):
		return JsonResponse({'detail': 'Only moderators, developers, or administrators can change visibility.'}, status=403)

	if request.method == 'POST':
		payload = parse_json_body(request)
		if payload is None:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

		if 'is_hidden' not in payload:
			return JsonResponse({'detail': 'is_hidden is required.'}, status=400)

		post.is_hidden = bool(payload.get('is_hidden'))
		post.save(update_fields=['is_hidden', 'updated_at'])

		vote_score = Vote.objects.filter(post_id=post.id).aggregate(score=Sum('value'))['score'] or 0
		user_vote = Vote.objects.filter(post_id=post.id, user_id=actor.id).values_list('value', flat=True).first()
		return JsonResponse(
			_post_to_dict(
				post,
				user_votes_by_post_id={post.id: user_vote} if user_vote else {},
				vote_scores_by_post_id={post.id: vote_score},
			)
		)

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)
