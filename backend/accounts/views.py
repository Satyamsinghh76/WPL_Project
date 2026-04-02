import json
import urllib.request
import urllib.error

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password

from .auth import get_allowed_role_switch_targets, get_authenticated_user, get_bearer_token, get_effective_role
from .models import PlatformUser
from .models import AuthToken


DEMO_USERS = {
	'admin': {
		'email': 'admin@scholr.local',
		'full_name': 'Administrator',
		'role': PlatformUser.ROLE_ADMIN,
	},
}


def _user_payload(user):
	"""Build the standard user JSON response dict."""
	return {
		'id': user.id,
		'username': user.username,
		'email': user.email,
		'full_name': user.full_name,
		'institution': user.institution,
		'bio': user.bio,
		'tagline': user.tagline,
		'skills': user.get_skills_list(),
		'links': user.get_links_dict(),
		'phone_number': user.phone_number,
		'profile_picture': user.profile_picture,
		'role': user.role,
		'is_active': user.is_active,
		'created_at': user.created_at.isoformat(),
	}


def _upsert_oauth_user(supabase_user):
	sub = supabase_user.get('id', '')
	email = supabase_user.get('email', '')
	meta = supabase_user.get('user_metadata', {})
	full_name = meta.get('full_name') or meta.get('name') or email.split('@')[0]
	avatar_url = meta.get('avatar_url') or meta.get('picture') or ''

	if not sub or not email:
		return None, JsonResponse({'detail': 'Could not retrieve user info from Supabase.'}, status=400)

	user = PlatformUser.objects.filter(supabase_id=sub).first()
	if not user:
		user = PlatformUser.objects.filter(email=email).first()

	if user:
		updates = []
		if not user.supabase_id:
			user.supabase_id = sub
			updates.append('supabase_id')
		if user.role == PlatformUser.ROLE_GENERAL:
			user.role = PlatformUser.ROLE_VERIFIED
			updates.append('role')
		if avatar_url and not user.profile_picture:
			user.profile_picture = avatar_url
			updates.append('profile_picture')
		if updates:
			user.save(update_fields=updates)
		return user, None

	username = email.split('@')[0]
	base_username = username
	counter = 1
	while PlatformUser.objects.filter(username=username).exists():
		username = f'{base_username}{counter}'
		counter += 1

	user = PlatformUser.objects.create(
		username=username,
		email=email,
		full_name=full_name,
		profile_picture=avatar_url,
		supabase_id=sub,
		role=PlatformUser.ROLE_VERIFIED,
	)
	return user, None


def role_options(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	roles = [choice[0] for choice in PlatformUser.ROLE_CHOICES]
	return JsonResponse({'roles': roles})


def switchable_roles(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	return JsonResponse(
		{
			'base_role': actor.role,
			'effective_role': get_effective_role(request, actor),
			'allowed_roles': get_allowed_role_switch_targets(actor),
		}
	)


@csrf_exempt
def users(request):
	if request.method == 'GET':
		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		if get_effective_role(request, actor) != PlatformUser.ROLE_ADMIN:
			return JsonResponse({'detail': 'Admin access required.'}, status=403)

		records = PlatformUser.objects.all().values(
			'id', 'username', 'email', 'full_name', 'role', 'is_active', 'created_at'
		)
		return JsonResponse({'results': list(records)})

	if request.method == 'POST':
		try:
			payload = json.loads(request.body or '{}')
		except json.JSONDecodeError:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

		required_fields = ['username', 'email', 'full_name', 'password']
		missing = [field for field in required_fields if not payload.get(field)]
		if missing:
			return JsonResponse({'detail': f"Missing fields: {', '.join(missing)}"}, status=400)

		user = PlatformUser.objects.create(
			username=payload['username'],
			password_hash=make_password(payload['password']),
			email=payload['email'],
			full_name=payload['full_name'],
			institution=payload.get('institution', ''),
			bio=payload.get('bio', ''),
			role=PlatformUser.ROLE_GENERAL,
		)
		return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role}, status=201)

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def login(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	username = (payload.get('username') or '').strip()
	password = payload.get('password') or ''
	if not username or not password:
		return JsonResponse({'detail': 'username and password are required.'}, status=400)

	user = PlatformUser.objects.filter(username=username, is_active=True).first()
	if not user:
		demo = DEMO_USERS.get(username.lower())
		if demo and username.lower() == 'admin' and password == 'admin':
			user = PlatformUser.objects.create(
				username=username,
				password_hash=make_password(password),
				email=demo['email'],
				full_name=demo['full_name'],
				role=demo['role'],
			)
	if not user:
		return JsonResponse({'detail': 'Invalid credentials.'}, status=401)

	if not user.password_hash:
		if password == user.username:
			user.password_hash = make_password(password)
			user.save(update_fields=['password_hash'])
		else:
			return JsonResponse({'detail': 'Invalid credentials.'}, status=401)

	if not check_password(password, user.password_hash):
		return JsonResponse({'detail': 'Invalid credentials.'}, status=401)

	token = AuthToken.issue_for_user(user)

	return JsonResponse({
		'token': token.key,
		'token_expires_at': token.expires_at.isoformat(),
		**_user_payload(user),
	})


@csrf_exempt
def user_detail(request, user_id):
	user = PlatformUser.objects.filter(id=user_id, is_active=True).first()
	if not user:
		return JsonResponse({'detail': 'User not found.'}, status=404)

	if request.method == 'GET':
		return JsonResponse(_user_payload(user))

	if request.method in ['PUT', 'PATCH']:
		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		actor_role = get_effective_role(request, actor)
		if actor.id != user.id and actor_role not in [PlatformUser.ROLE_ADMIN, PlatformUser.ROLE_DEVELOPER]:
			return JsonResponse({'detail': 'You do not have permission to update this profile.'}, status=403)

		try:
			payload = json.loads(request.body or '{}')
		except json.JSONDecodeError:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

		update_fields = []
		for field in ['full_name', 'institution', 'bio', 'tagline', 'phone_number']:
			if field in payload and payload[field] != getattr(user, field):
				setattr(user, field, payload[field])
				update_fields.append(field)

		if 'skills' in payload:
			if isinstance(payload['skills'], list):
				user.set_skills_list(payload['skills'])
			else:
				user.skills = payload['skills']
			update_fields.append('skills')

		if 'links' in payload:
			if isinstance(payload['links'], dict):
				user.set_links_dict(payload['links'])
			else:
				user.links = payload['links']
			update_fields.append('links')

		if 'role' in payload:
			if actor_role != PlatformUser.ROLE_ADMIN:
				return JsonResponse({'detail': 'Only admins can change roles.'}, status=403)
			if payload['role'] not in {choice[0] for choice in PlatformUser.ROLE_CHOICES}:
				return JsonResponse({'detail': 'Invalid role.'}, status=400)
			if payload['role'] != user.role:
				user.role = payload['role']
				update_fields.append('role')

		if update_fields:
			user.save(update_fields=update_fields)
		return JsonResponse(_user_payload(user))

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def logout(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	token_key = get_bearer_token(request)
	if not token_key:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	token = AuthToken.objects.filter(key=token_key, user=actor, is_revoked=False).first()
	if token:
		token.is_revoked = True
		token.save(update_fields=['is_revoked'])

	return JsonResponse({'detail': 'Logged out successfully.'})


@csrf_exempt
def oauth_callback(request):
	"""Exchange a Supabase access_token for a local AuthToken.

	Frontend sends: { "access_token": "<supabase-jwt>" }
	Backend verifies it against Supabase, creates/finds a PlatformUser,
	and requires a local password before issuing an AuthToken.
	"""
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	access_token = (payload.get('access_token') or '').strip()
	password = (payload.get('password') or '').strip()
	if not access_token:
		return JsonResponse({'detail': 'access_token is required.'}, status=400)

	supabase_url = settings.SUPABASE_URL
	if not supabase_url:
		return JsonResponse({'detail': 'Supabase is not configured on the server.'}, status=500)

	# Verify the token by calling Supabase's /auth/v1/user endpoint
	req = urllib.request.Request(
		f'{supabase_url}/auth/v1/user',
		headers={
			'Authorization': f'Bearer {access_token}',
			'apikey': settings.SUPABASE_ANON_KEY,
		},
	)
	try:
		with urllib.request.urlopen(req) as resp:
			supabase_user = json.loads(resp.read().decode())
	except urllib.error.HTTPError:
		return JsonResponse({'detail': 'Invalid or expired Supabase token.'}, status=401)

	user, error_response = _upsert_oauth_user(supabase_user)
	if error_response:
		return error_response

	if not user.is_active:
		return JsonResponse({'detail': 'Account is deactivated.'}, status=403)

	if password:
		if user.password_hash:
			if not check_password(password, user.password_hash):
				return JsonResponse({'detail': 'Invalid password.'}, status=401)
		else:
			user.password_hash = make_password(password)
			update_fields = ['password_hash']
			if user.role == PlatformUser.ROLE_GENERAL:
				user.role = PlatformUser.ROLE_VERIFIED
				update_fields.append('role')
			user.save(update_fields=update_fields)
		if user.role == PlatformUser.ROLE_GENERAL:
			user.role = PlatformUser.ROLE_VERIFIED
			user.save(update_fields=['role'])

		token = AuthToken.issue_for_user(user)
		return JsonResponse({
			'token': token.key,
			'token_expires_at': token.expires_at.isoformat(),
			**_user_payload(user),
		})

	return JsonResponse({
		'requires_password': True,
		'user': _user_payload(user),
	})


def me(request):
	"""GET /api/accounts/me/ — return the currently authenticated user."""
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	return JsonResponse(_user_payload(actor))


@csrf_exempt
def public_profile(request, username):
	"""GET /api/accounts/public/<username>/ — get public profile data."""
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	user = PlatformUser.objects.filter(username=username, is_active=True).first()
	if not user:
		return JsonResponse({'detail': 'User not found.'}, status=404)

	return JsonResponse(_user_payload(user))
