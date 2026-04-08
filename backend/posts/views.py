import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.db.models import IntegerField, Q, Sum
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from django.utils.dateparse import parse_datetime

from accounts.auth import get_authenticated_user, get_effective_role, parse_json_body
from accounts.models import PlatformUser
from accounts.storage import resolve_profile_picture_url
from interactions.models import Vote

from .models import Post, Topic


VALID_CONTENT_TYPES = {choice[0] for choice in Post.CONTENT_TYPE_CHOICES}


MAX_POST_MEDIA_FILES = 8
MAX_POST_IMAGE_BYTES = 10 * 1024 * 1024
MAX_POST_VIDEO_BYTES = 50 * 1024 * 1024


def _sanitize_filename(filename, fallback='file.bin'):
	safe_name = ''.join(ch for ch in (filename or '') if ch.isalnum() or ch in {'.', '-', '_'})
	return safe_name or fallback


def _get_supabase_media_bucket():
	return getattr(settings, 'SUPABASE_POST_MEDIA_BUCKET', 'profile-pictures')


def _get_signed_url_ttl_seconds():
	raw = getattr(settings, 'SUPABASE_SIGNED_URL_TTL_SECONDS', 300)
	try:
		return max(30, min(int(raw), 3600))
	except (TypeError, ValueError):
		return 300


def _upload_media_to_supabase(path, raw_bytes, content_type='application/octet-stream'):
	service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
	if not service_role_key:
		return None, JsonResponse({'detail': 'SUPABASE_SERVICE_ROLE_KEY is required for media uploads.'}, status=500)

	bucket = _get_supabase_media_bucket()
	upload_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{path}"
	request = urllib.request.Request(
		upload_url,
		method='POST',
		data=raw_bytes,
		headers={
			'apikey': service_role_key,
			'authorization': f'Bearer {service_role_key}',
			'content-type': content_type,
			'x-upsert': 'false',
		},
	)

	try:
		with urllib.request.urlopen(request, timeout=30):
			return path, None
	except urllib.error.HTTPError as exc:
		raw_message = exc.read().decode('utf-8', errors='ignore') or exc.reason or 'Failed to upload media.'
		return None, JsonResponse({'detail': raw_message}, status=exc.code)
	except urllib.error.URLError as exc:
		return None, JsonResponse({'detail': f'Failed to reach Supabase storage: {exc.reason}'}, status=502)


def _create_supabase_signed_url(path, expires_in=None):
	service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
	if not service_role_key:
		return None, JsonResponse({'detail': 'SUPABASE_SERVICE_ROLE_KEY is required for signed URLs.'}, status=500)

	bucket = _get_supabase_media_bucket()
	ttl_seconds = expires_in or _get_signed_url_ttl_seconds()
	encoded_path = urllib.parse.quote(path, safe='/')
	sign_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/{bucket}/{encoded_path}"
	body = json.dumps({'expiresIn': ttl_seconds}).encode('utf-8')
	request = urllib.request.Request(
		sign_url,
		method='POST',
		data=body,
		headers={
			'apikey': service_role_key,
			'authorization': f'Bearer {service_role_key}',
			'content-type': 'application/json',
		},
	)

	try:
		with urllib.request.urlopen(request, timeout=20) as response:
			payload = json.loads(response.read().decode('utf-8') or '{}')
			signed_url = payload.get('signedURL') or payload.get('signedUrl')
			if not signed_url:
				return None, JsonResponse({'detail': 'Supabase did not return a signed URL.'}, status=502)
			if signed_url.startswith('http://') or signed_url.startswith('https://'):
				return signed_url, None
			if signed_url.startswith('/storage/v1/'):
				return f"{settings.SUPABASE_URL.rstrip('/')}{signed_url}", None
			if signed_url.startswith('/object/sign/'):
				return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_url}", None
			if signed_url.startswith('/'):
				return f"{settings.SUPABASE_URL.rstrip('/')}{signed_url}", None
			return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/{signed_url}", None
	except urllib.error.HTTPError as exc:
		raw_message = exc.read().decode('utf-8', errors='ignore') or exc.reason or 'Failed to create signed URL.'
		return None, JsonResponse({'detail': raw_message}, status=exc.code)
	except urllib.error.URLError as exc:
		return None, JsonResponse({'detail': f'Failed to reach Supabase storage: {exc.reason}'}, status=502)


def _normalize_media_items(media_items, author_id):
	if media_items in (None, ''):
		return [], None

	if not isinstance(media_items, list):
		return None, JsonResponse({'detail': 'media_items must be a list.'}, status=400)

	if len(media_items) > MAX_POST_MEDIA_FILES:
		return None, JsonResponse({'detail': f'You can attach up to {MAX_POST_MEDIA_FILES} files per post.'}, status=400)

	prefix = f'posts/{author_id}/'
	normalized = []
	for item in media_items:
		if not isinstance(item, dict):
			return None, JsonResponse({'detail': 'Each media item must be an object.'}, status=400)

		path = (item.get('path') or '').strip()
		kind = (item.get('kind') or '').strip().lower()
		content_type = (item.get('content_type') or '').strip().lower()

		if not path:
			return None, JsonResponse({'detail': 'Each media item requires a path.'}, status=400)
		if not path.startswith(prefix):
			return None, JsonResponse({'detail': 'Media path is not allowed for this user.'}, status=403)
		if kind not in {'image', 'video'}:
			return None, JsonResponse({'detail': 'Media kind must be image or video.'}, status=400)
		if len(content_type) > 120:
			return None, JsonResponse({'detail': 'Invalid media content_type.'}, status=400)

		normalized.append(
			{
				'path': path,
				'kind': kind,
				'content_type': content_type,
			}
		)

	return normalized, None


def _with_signed_urls(media_items):
	resolved = []
	for item in media_items or []:
		path = item.get('path')
		if not path:
			continue
		signed_url, _ = _create_supabase_signed_url(path)
		resolved.append(
			{
				'path': path,
				'kind': item.get('kind') or 'image',
				'content_type': item.get('content_type') or '',
				'signed_url': signed_url,
			}
		)
	return resolved


def _post_to_dict(post, user_votes_by_post_id=None, vote_scores_by_post_id=None):
	"""Convert post to dict. Uses pre-fetched vote data to avoid N+1 queries."""
	user_vote = None
	if user_votes_by_post_id and post.id in user_votes_by_post_id:
		user_vote = user_votes_by_post_id[post.id]
	
	score = getattr(post, 'score', 0) or 0
	if vote_scores_by_post_id and post.id in vote_scores_by_post_id:
		score = vote_scores_by_post_id[post.id] or 0

	media_items = post.media_items if isinstance(post.media_items, list) else []

	# Parse references from JSON string
	try:
		references = json.loads(post.references) if isinstance(post.references, str) else post.references
		if not isinstance(references, list):
			references = []
	except (json.JSONDecodeError, TypeError):
		references = []

	return {
		'id': post.id,
		'title': post.title,
		'content_type': post.content_type,
		'content_type_label': post.get_content_type_display(),
		'content': post.content,
		'references': references,
		'is_ai': post.is_ai,
		'author_id': post.author_id,
		'author': post.author.username,
		'topic': post.topic.name if post.topic else None,
		'topic_id': post.topic_id,
		'is_hidden': post.is_hidden,
		'media_items': _with_signed_urls(media_items),
		'score': score,
		'user_vote': user_vote,
		'created_at': post.created_at.isoformat(),
		'updated_at': post.updated_at.isoformat(),
	}


def _decode_cursor(cursor):
	if not cursor:
		return None, None

	created_at_raw, separator, post_id_raw = cursor.partition('|')
	if not separator:
		created_at_raw = cursor
		post_id_raw = ''

	created_at = parse_datetime(created_at_raw)
	if created_at is None:
		return None, None

	try:
		post_id = int(post_id_raw) if post_id_raw else None
	except (TypeError, ValueError):
		post_id = None

	return created_at, post_id


def _encode_cursor(post):
	return f'{post.created_at.isoformat()}|{post.id}'


def _decode_hot_cursor(cursor):
	if not cursor:
		return None, None, None

	parts = cursor.split('|')
	if len(parts) != 3:
		return None, None, None

	try:
		score = int(parts[0])
	except (TypeError, ValueError):
		return None, None, None

	created_at = parse_datetime(parts[1])
	if created_at is None:
		return None, None, None

	try:
		post_id = int(parts[2])
	except (TypeError, ValueError):
		return None, None, None

	return score, created_at, post_id


def _encode_hot_cursor(post):
	return f'{getattr(post, "score", 0) or 0}|{post.created_at.isoformat()}|{post.id}'


def _topic_scope_ids(topic_id):
	"""Return selected topic id plus all descendant topic ids."""
	try:
		root_id = int(topic_id)
	except (TypeError, ValueError):
		return []

	ids = [root_id]
	frontier = [root_id]

	while frontier:
		children = list(Topic.objects.filter(parent_id__in=frontier).values_list('id', flat=True))
		if not children:
			break
		ids.extend(children)
		frontier = children

	return ids


def _normalize_content_type(raw_value):
	value = (raw_value or '').strip().lower()
	if not value or value == 'all':
		return None
	if value not in VALID_CONTENT_TYPES:
		return None
	return value


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
					'profile_picture': resolve_profile_picture_url(u.profile_picture),
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
		content_type_raw = request.GET.get('content_type')
		content_type = _normalize_content_type(content_type_raw)
		if content_type_raw and content_type is None:
			return JsonResponse({'detail': 'Invalid content_type filter.'}, status=400)
		
		# Parse is_ai filter
		is_ai_filter = request.GET.get('is_ai')
		is_ai_value = None
		if is_ai_filter and is_ai_filter.lower() in ('true', '1', 'yes'):
			is_ai_value = True
		elif is_ai_filter and is_ai_filter.lower() in ('false', '0', 'no'):
			is_ai_value = False
		
		# Build queryset with filters
		queryset = Post.objects.filter(is_deleted=False).select_related('author', 'topic')
		if not can_view_hidden:
			queryset = queryset.filter(is_hidden=False)
		
		# Filter by topic if provided
		if topic_id:
			topic_scope_ids = _topic_scope_ids(topic_id)
			if topic_scope_ids:
				queryset = queryset.filter(topic_id__in=topic_scope_ids)

		if content_type:
			queryset = queryset.filter(content_type=content_type)
		
		# Filter by is_ai if provided
		if is_ai_value is not None:
			queryset = queryset.filter(is_ai=is_ai_value)
		
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
			'content_type': content_type,
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

		content_type = _normalize_content_type(payload.get('content_type')) or Post.CONTENT_TYPE_OTHER
		if content_type not in VALID_CONTENT_TYPES:
			return JsonResponse({'detail': 'Invalid content_type.'}, status=400)

		# Handle references - ensure at least one is provided
		references_list = payload.get('references', [])
		if not isinstance(references_list, list):
			references_list = []
		if not references_list:
			# Default to scholr.com if no references provided
			references_list = [{'title': 'Reference', 'url': 'https://scholr.com'}]
		# Validate references
		for ref in references_list:
			if not isinstance(ref, dict) or not ref.get('url'):
				return JsonResponse({'detail': 'Each reference must have a url.'}, status=400)
		references_json = json.dumps(references_list)

		media_items, media_error = _normalize_media_items(payload.get('media_items', []), author.id)
		if media_error:
			return media_error

		is_ai = payload.get('is_ai', False)
		if not isinstance(is_ai, bool):
			is_ai = False

		post = Post.objects.create(
			author=author,
			topic=topic,
			content_type=content_type,
			title=payload['title'],
			content=payload['content'],
			references=references_json,
			media_items=media_items,
			is_ai=is_ai,
		)
		# Refresh from DB to get related data
		post.refresh_from_db()
		post = Post.objects.filter(id=post.id).select_related('author', 'topic').first()
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id={}, vote_scores_by_post_id={}), status=201)

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def post_detail(request, post_id):
	"""Get, edit, or delete a specific post."""
	if request.method == 'GET':
		actor = get_authenticated_user(request)
		actor_role = get_effective_role(request, actor)
		can_view_hidden = _can_moderate_posts(actor_role)
		viewer_id = request.GET.get('viewer_id')
		
		post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
		if not post:
			return JsonResponse({'detail': 'Post not found.'}, status=404)
		
		if post.is_hidden and not can_view_hidden:
			return JsonResponse({'detail': 'Post not found.'}, status=404)
		
		# Get votes for this post
		post_ids = [post.id]
		vote_scores = {}
		user_votes = {}
		
		vote_scores_data = Vote.objects.filter(post_id__in=post_ids).values('post_id').annotate(score=Sum('value'))
		vote_scores = {v['post_id']: v['score'] for v in vote_scores_data}
		
		if viewer_id:
			user_votes_data = Vote.objects.filter(post_id__in=post_ids, user_id=viewer_id).values_list('post_id', 'value')
			user_votes = {post_id: value for post_id, value in user_votes_data}
		
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id=user_votes, vote_scores_by_post_id=vote_scores))
	
	elif request.method in ('PUT', 'PATCH'):
		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		
		post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
		if not post:
			return JsonResponse({'detail': 'Post not found.'}, status=404)
		
		# Only the original post author can edit.
		if post.author_id != actor.id:
			return JsonResponse({'detail': 'You can only edit your own posts.'}, status=403)
		
		payload = parse_json_body(request)
		if payload is None:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)
		
		# Update title if provided
		if 'title' in payload:
			post.title = payload['title'].strip()
		
		# Update content if provided
		if 'content' in payload:
			post.content = payload['content']
		
		# Update topic if provided
		if 'topic_id' in payload:
			if payload['topic_id']:
				topic = Topic.objects.filter(id=payload['topic_id']).first()
				post.topic = topic
			else:
				post.topic = None
		
		# Update content_type if provided
		if 'content_type' in payload:
			content_type = _normalize_content_type(payload.get('content_type'))
			if content_type and content_type in VALID_CONTENT_TYPES:
				post.content_type = content_type
		
		# Update references if provided
		if 'references' in payload:
			references_list = payload.get('references', [])
			if not isinstance(references_list, list):
				references_list = []
			if not references_list:
				references_list = [{'title': 'Reference', 'url': 'https://scholr.com'}]
			# Validate references
			for ref in references_list:
				if not isinstance(ref, dict) or not ref.get('url'):
					return JsonResponse({'detail': 'Each reference must have a url.'}, status=400)
			post.references = json.dumps(references_list)
		
		# Update is_ai if provided
		if 'is_ai' in payload:
			is_ai = payload.get('is_ai', False)
			if isinstance(is_ai, bool):
				post.is_ai = is_ai
		
		# Update media_items if provided
		if 'media_items' in payload:
			media_items, media_error = _normalize_media_items(payload.get('media_items', []), post.author_id)
			if media_error:
				return media_error
			post.media_items = media_items
		
		post.save()
		post.refresh_from_db()
		post = Post.objects.filter(id=post.id).select_related('author', 'topic').first()
		
		return JsonResponse(_post_to_dict(post, user_votes_by_post_id={}, vote_scores_by_post_id={}))
	
	else:
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def upload_post_media(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	actor_role = get_effective_role(request, actor)
	if not _is_privileged_role(actor_role):
		return JsonResponse({'detail': 'Your role is read-only and cannot upload post media.'}, status=403)

	payload = parse_json_body(request)
	if payload is None:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	files = payload.get('files')
	if not isinstance(files, list) or not files:
		return JsonResponse({'detail': 'files must be a non-empty list.'}, status=400)
	if len(files) > MAX_POST_MEDIA_FILES:
		return JsonResponse({'detail': f'You can upload up to {MAX_POST_MEDIA_FILES} files at once.'}, status=400)

	uploaded_items = []
	for index, entry in enumerate(files):
		if not isinstance(entry, dict):
			return JsonResponse({'detail': 'Each file payload must be an object.'}, status=400)

		data_b64 = (entry.get('data_base64') or '').strip()
		filename = _sanitize_filename(entry.get('filename') or f'file-{index + 1}.bin')
		content_type = (entry.get('content_type') or 'application/octet-stream').strip().lower()

		if not data_b64:
			return JsonResponse({'detail': f'data_base64 is required for file #{index + 1}.'}, status=400)

		try:
			raw_bytes = base64.b64decode(data_b64)
		except Exception:
			return JsonResponse({'detail': f'Invalid base64 payload for file #{index + 1}.'}, status=400)

		if content_type.startswith('image/'):
			kind = 'image'
			if len(raw_bytes) > MAX_POST_IMAGE_BYTES:
				return JsonResponse({'detail': 'Each image must be 10MB or smaller.'}, status=400)
		elif content_type.startswith('video/'):
			kind = 'video'
			if len(raw_bytes) > MAX_POST_VIDEO_BYTES:
				return JsonResponse({'detail': 'Each video must be 50MB or smaller.'}, status=400)
		else:
			return JsonResponse({'detail': 'Only image/* and video/* files are allowed.'}, status=400)

		path = f"posts/{actor.id}/{int(time.time() * 1000)}-{index}-{filename}"
		uploaded_path, upload_error = _upload_media_to_supabase(path, raw_bytes, content_type=content_type)
		if upload_error:
			return upload_error

		signed_url, _ = _create_supabase_signed_url(uploaded_path)
		uploaded_items.append(
			{
				'path': uploaded_path,
				'kind': kind,
				'content_type': content_type,
				'signed_url': signed_url,
			}
		)

	return JsonResponse({'items': uploaded_items}, status=201)


@csrf_exempt
def post_feed(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	actor_role = get_effective_role(request, actor)
	can_view_hidden = _can_moderate_posts(actor_role)
	viewer_id = request.GET.get('viewer_id')
	limit_raw = request.GET.get('limit', 10)
	cursor = request.GET.get('cursor')
	sort_by = (request.GET.get('sort', 'new') or 'new').lower()
	topic_id = request.GET.get('topic_id')
	content_type_raw = request.GET.get('content_type')
	content_type = _normalize_content_type(content_type_raw)
	is_ai_filter = request.GET.get('is_ai')
	is_ai_value = None
	if is_ai_filter and is_ai_filter.lower() in ('true', '1', 'yes'):
		is_ai_value = True
	elif is_ai_filter and is_ai_filter.lower() in ('false', '0', 'no'):
		is_ai_value = False
	if content_type_raw and content_type is None:
		return JsonResponse({'detail': 'Invalid content_type filter.'}, status=400)

	try:
		limit = max(1, min(int(limit_raw), 50))
	except (TypeError, ValueError):
		limit = 10

	queryset = Post.objects.filter(is_deleted=False).select_related('author', 'topic')
	if not can_view_hidden:
		queryset = queryset.filter(is_hidden=False)

	if topic_id:
		topic_scope_ids = _topic_scope_ids(topic_id)
		if topic_scope_ids:
			queryset = queryset.filter(topic_id__in=topic_scope_ids)

	if content_type:
		queryset = queryset.filter(content_type=content_type)

	if is_ai_value is not None:
		queryset = queryset.filter(is_ai=is_ai_value)

	if sort_by == 'hot':
		queryset = queryset.annotate(score=Coalesce(Sum('votes__value'), 0, output_field=IntegerField()))
		cursor_score, cursor_created_at, cursor_post_id = _decode_hot_cursor(cursor)
		if cursor_score is not None and cursor_created_at is not None and cursor_post_id is not None:
			hot_cursor_filter = (
				Q(score__lt=cursor_score)
				| Q(score=cursor_score, created_at__lt=cursor_created_at)
				| Q(score=cursor_score, created_at=cursor_created_at, id__lt=cursor_post_id)
			)
			queryset = queryset.filter(hot_cursor_filter)
		queryset = queryset.order_by('-score', '-created_at', '-id')[: limit + 1]
	else:
		sort_by = 'new'
		cursor_created_at, cursor_post_id = _decode_cursor(cursor)
		if cursor_created_at:
			cursor_filter = Q(created_at__lt=cursor_created_at)
			if cursor_post_id:
				cursor_filter |= Q(created_at=cursor_created_at, id__lt=cursor_post_id)
			queryset = queryset.filter(cursor_filter)
		queryset = queryset.order_by('-created_at', '-id')[: limit + 1]
	posts = list(queryset)
	has_more = len(posts) > limit
	posts = posts[:limit]
	post_ids = [post.id for post in posts]

	vote_scores = {}
	user_votes = {}
	if post_ids:
		vote_scores_data = Vote.objects.filter(post_id__in=post_ids).values('post_id').annotate(score=Sum('value'))
		vote_scores = {row['post_id']: row['score'] for row in vote_scores_data}
		if viewer_id:
			user_votes_data = Vote.objects.filter(post_id__in=post_ids, user_id=viewer_id).values_list('post_id', 'value')
			user_votes = {post_id: value for post_id, value in user_votes_data}

	if has_more and posts:
		next_cursor = _encode_hot_cursor(posts[-1]) if sort_by == 'hot' else _encode_cursor(posts[-1])
	else:
		next_cursor = None

	return JsonResponse(
		{
			'posts': [_post_to_dict(post, user_votes_by_post_id=user_votes, vote_scores_by_post_id=vote_scores) for post in posts],
			'next_cursor': next_cursor,
			'has_more': has_more,
			'sort': sort_by,
			'topic_id': topic_id,
			'content_type': content_type,
			'is_ai': is_ai_value,
		}
	)


@csrf_exempt
def related_posts(request, post_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	actor_role = get_effective_role(request, actor)
	can_view_hidden = _can_moderate_posts(actor_role)
	viewer_id = request.GET.get('viewer_id')
	limit_raw = request.GET.get('limit', 3)

	try:
		limit = max(1, min(int(limit_raw), 6))
	except (TypeError, ValueError):
		limit = 3

	post = Post.objects.filter(id=post_id, is_deleted=False).select_related('author', 'topic').first()
	if not post:
		return JsonResponse({'detail': 'Post not found.'}, status=404)

	if not post.topic_id:
		return JsonResponse({'results': []})

	queryset = Post.objects.filter(is_deleted=False, topic_id=post.topic_id).exclude(id=post.id).select_related('author', 'topic')
	if not can_view_hidden:
		queryset = queryset.filter(is_hidden=False)

	queryset = queryset.annotate(score=Coalesce(Sum('votes__value'), 0, output_field=IntegerField())).order_by('-score', '-created_at', '-id')[:limit]
	posts = list(queryset)
	post_ids = [item.id for item in posts]

	vote_scores = {item.id: item.score for item in posts}
	user_votes = {}
	if viewer_id and post_ids:
		user_votes_data = Vote.objects.filter(post_id__in=post_ids, user_id=viewer_id).values_list('post_id', 'value')
		user_votes = {post_id: value for post_id, value in user_votes_data}

	return JsonResponse(
		{
			'results': [_post_to_dict(item, user_votes_by_post_id=user_votes, vote_scores_by_post_id=vote_scores) for item in posts]
		}
	)


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

		if 'title' in payload:
			title = (payload.get('title') or '').strip()
			if not title:
				return JsonResponse({'detail': 'Title cannot be empty.'}, status=400)
			post.title = title

		if 'content' in payload:
			content = payload.get('content')
			if not isinstance(content, str):
				return JsonResponse({'detail': 'Content must be a string.'}, status=400)
			post.content = content

		if 'references' in payload:
			references_list = payload.get('references', [])
			if not isinstance(references_list, list):
				return JsonResponse({'detail': 'references must be a list.'}, status=400)
			if not references_list:
				references_list = [{'title': 'Reference', 'url': 'https://scholr.com'}]
			for ref in references_list:
				if not isinstance(ref, dict) or not (ref.get('url') or '').strip():
					return JsonResponse({'detail': 'Each reference must have a url.'}, status=400)
			post.references = json.dumps(references_list)

		if 'topic_id' in payload:
			topic_id = payload.get('topic_id')
			post.topic = Topic.objects.filter(id=topic_id).first() if topic_id else None

		if 'content_type' in payload:
			next_content_type = _normalize_content_type(payload.get('content_type'))
			if next_content_type is None:
				return JsonResponse({'detail': 'Invalid content_type.'}, status=400)
			post.content_type = next_content_type

		if 'is_ai' in payload:
			is_ai = payload.get('is_ai')
			if isinstance(is_ai, bool):
				post.is_ai = is_ai
			elif isinstance(is_ai, str):
				value = is_ai.strip().lower()
				if value in {'true', '1', 'yes'}:
					post.is_ai = True
				elif value in {'false', '0', 'no'}:
					post.is_ai = False
				else:
					return JsonResponse({'detail': 'is_ai must be true or false.'}, status=400)
			else:
				return JsonResponse({'detail': 'is_ai must be a boolean.'}, status=400)

		if 'media_items' in payload:
			media_items, media_error = _normalize_media_items(payload.get('media_items'), post.author_id)
			if media_error:
				return media_error
			post.media_items = media_items

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
