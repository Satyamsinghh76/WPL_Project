import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password

from .auth import get_authenticated_user, get_bearer_token
from .models import PlatformUser
from .models import AuthToken


DEMO_USERS = {
	'admin': {
		'email': 'admin@scholr.local',
		'full_name': 'Administrator',
		'role': PlatformUser.ROLE_ADMIN,
	},
	'dev': {
		'email': 'dev@scholr.local',
		'full_name': 'Developer',
		'role': PlatformUser.ROLE_DEVELOPER,
	},
	'mod': {
		'email': 'mod@scholr.local',
		'full_name': 'Moderator',
		'role': PlatformUser.ROLE_MODERATOR,
	},
	'userv': {
		'email': 'verified@scholr.local',
		'full_name': 'Verified User',
		'role': PlatformUser.ROLE_VERIFIED,
	},
	'user': {
		'email': 'user@scholr.local',
		'full_name': 'General User',
		'role': PlatformUser.ROLE_GENERAL,
	},
}


def role_options(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	roles = [choice[0] for choice in PlatformUser.ROLE_CHOICES]
	return JsonResponse({'roles': roles})


@csrf_exempt
def users(request):
	if request.method == 'GET':
		records = PlatformUser.objects.all().values(
			'id', 'username', 'email', 'full_name', 'institution', 'role', 'is_active', 'created_at'
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
			role=payload.get('role', PlatformUser.ROLE_GENERAL),
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
		if demo and password == username:
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

	return JsonResponse(
		{
			'token': token.key,
			'token_expires_at': token.expires_at.isoformat(),
			'id': user.id,
			'username': user.username,
			'email': user.email,
			'full_name': user.full_name,
			'institution': user.institution,
			'bio': user.bio,
			'role': user.role,
			'is_active': user.is_active,
			'created_at': user.created_at.isoformat(),
		}
	)


@csrf_exempt
def user_detail(request, user_id):
	user = PlatformUser.objects.filter(id=user_id, is_active=True).first()
	if not user:
		return JsonResponse({'detail': 'User not found.'}, status=404)

	if request.method == 'GET':
		return JsonResponse(
			{
				'id': user.id,
				'username': user.username,
				'email': user.email,
				'full_name': user.full_name,
				'institution': user.institution,
				'bio': user.bio,
				'role': user.role,
				'is_active': user.is_active,
				'created_at': user.created_at.isoformat(),
			}
		)

	if request.method in ['PUT', 'PATCH']:
		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		if actor.id != user.id and actor.role not in [PlatformUser.ROLE_ADMIN, PlatformUser.ROLE_DEVELOPER]:
			return JsonResponse({'detail': 'You do not have permission to update this profile.'}, status=403)

		try:
			payload = json.loads(request.body or '{}')
		except json.JSONDecodeError:
			return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

		for field in ['full_name', 'institution', 'bio']:
			if field in payload:
				setattr(user, field, payload[field])

		user.save(update_fields=['full_name', 'institution', 'bio'])
		return JsonResponse({'detail': 'Profile updated.'})

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
