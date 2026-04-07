import json
import urllib.request
import urllib.error
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password

from .auth import get_allowed_role_switch_targets, get_authenticated_user, get_bearer_token, get_effective_role
from .emails import send_verification_email, send_password_reset_email, send_welcome_email
from .models import AuthToken, EmailToken, PlatformUser


logger = logging.getLogger(__name__)


def _user_payload(user):
	"""Build the standard user JSON response dict."""
	return {
		'id': user.id,
		'username': user.username,
		'email': user.email,
		'email_verified': user.email_verified,
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


def _normalize_email(value):
	return (value or '').strip().lower()


def _upsert_oauth_user(supabase_user):
	sub = supabase_user.get('id', '')
	email = _normalize_email(supabase_user.get('email', ''))
	meta = supabase_user.get('user_metadata', {})
	full_name = meta.get('full_name') or meta.get('name') or email.split('@')[0]
	avatar_url = meta.get('avatar_url') or meta.get('picture') or ''

	if not sub or not email:
		return None, JsonResponse({'detail': 'Could not retrieve user info from Supabase.'}, status=400)

	user = PlatformUser.objects.filter(supabase_id=sub).first()
	if not user:
		user = PlatformUser.objects.filter(email__iexact=email).first()

	if user:
		updates = []
		if not user.supabase_id:
			user.supabase_id = sub
			updates.append('supabase_id')
		if user.email != email:
			user.email = email
			updates.append('email')
		if not user.email_verified:
			user.email_verified = True
			updates.append('email_verified')
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
		email_verified=True,
		full_name=full_name,
		profile_picture=avatar_url,
		supabase_id=sub,
		role=PlatformUser.ROLE_VERIFIED,
	)

	# Send welcome/confirmation email for new OAuth account
	try:
		send_welcome_email(user, needs_verification=False)
	except Exception:
		logger.exception('Failed to send OAuth welcome email for user_id=%s', user.id)

	return user, None


def _delete_supabase_user(supabase_user_id):
	if not supabase_user_id:
		return True, None

	service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
	if not service_role_key:
		return False, JsonResponse(
			{'detail': 'Supabase service role key is required to delete OAuth users.'},
			status=500,
		)

	delete_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{supabase_user_id}"
	request = urllib.request.Request(
		delete_url,
		method='DELETE',
		headers={
			'apikey': service_role_key,
			'authorization': f'Bearer {service_role_key}',
		},
	)

	try:
		with urllib.request.urlopen(request, timeout=10) as response:
			if response.status in (200, 204):
				return True, None
	except urllib.error.HTTPError as exc:
			raw_message = exc.read().decode('utf-8', errors='ignore') or exc.reason or 'Failed to delete Supabase user.'
			if exc.code == 403 and 'not_admin' in raw_message:
				return False, JsonResponse(
					{
						'detail': (
							'Supabase rejected the admin delete request (not_admin). '
							'Your backend is not using a valid SUPABASE_SERVICE_ROLE_KEY for this project.'
						)
					},
					status=500,
				)
			return False, JsonResponse({'detail': raw_message}, status=exc.code)
	except urllib.error.URLError as exc:
		return False, JsonResponse({'detail': f'Failed to reach Supabase: {exc.reason}'}, status=502)

	return False, JsonResponse({'detail': 'Failed to delete Supabase user.'}, status=502)


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
			'id', 'username', 'email', 'email_verified', 'full_name', 'role', 'is_active', 'created_at'
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

		email = _normalize_email(payload.get('email'))
		if not email:
			return JsonResponse({'detail': 'Email is required.'}, status=400)
		if PlatformUser.objects.filter(email__iexact=email).exists():
			return JsonResponse(
				{'detail': 'Email already exists. Use that account with email/password or Google/LinkedIn.'},
				status=400,
			)

		user = PlatformUser.objects.create(
			username=payload['username'],
			password_hash=make_password(payload['password']),
			email=email,
			email_verified=False,
			full_name=payload['full_name'],
			institution=payload.get('institution', ''),
			bio=payload.get('bio', ''),
			role=PlatformUser.ROLE_GENERAL,
		)

		# Send welcome email + verification email
		send_welcome_email(user)
		verify_token = EmailToken.create_for(user, EmailToken.PURPOSE_VERIFY)
		send_verification_email(user, verify_token)

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
		if settings.DEBUG and username.lower() == 'admin' and password == 'admin':
			user = PlatformUser.objects.create(
				username=username,
				password_hash=make_password(password),
				email='admin@scholr.local',
				email_verified=True,
				full_name='Administrator',
				role=PlatformUser.ROLE_ADMIN,
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
	user = PlatformUser.objects.filter(id=user_id).first()
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

		if 'username' in payload and payload['username'] != user.username:
			new_username = (payload['username'] or '').strip()
			if not new_username:
				return JsonResponse({'detail': 'Username cannot be empty.'}, status=400)
			if PlatformUser.objects.filter(username=new_username).exclude(id=user.id).exists():
				return JsonResponse({'detail': 'Username already taken.'}, status=400)
			user.username = new_username
			update_fields.append('username')

		if 'email' in payload and payload['email'] != user.email:
			new_email = _normalize_email(payload['email'])
			if not new_email:
				return JsonResponse({'detail': 'Email cannot be empty.'}, status=400)
			if PlatformUser.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
				return JsonResponse({'detail': 'Email already taken.'}, status=400)
			user.email = new_email
			user.email_verified = False
			user.role = PlatformUser.ROLE_GENERAL
			update_fields.extend(['email', 'email_verified', 'role'])

		for field in ['full_name', 'institution', 'bio', 'tagline', 'phone_number', 'profile_picture']:
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

		if 'is_active' in payload:
			if actor_role != PlatformUser.ROLE_ADMIN:
				return JsonResponse({'detail': 'Only admins can update account status.'}, status=403)
			if bool(payload['is_active']) != user.is_active:
				user.is_active = bool(payload['is_active'])
				update_fields.append('is_active')

		if update_fields:
			user.save(update_fields=update_fields)
		return JsonResponse(_user_payload(user))

	if request.method == 'DELETE':
		actor = get_authenticated_user(request)
		if not actor:
			return JsonResponse({'detail': 'Authentication required.'}, status=401)
		actor_role = get_effective_role(request, actor)
		if actor_role != PlatformUser.ROLE_ADMIN:
			return JsonResponse({'detail': 'Only admins can delete users.'}, status=403)
		
		if actor.id == user.id:
			return JsonResponse({'detail': 'Cannot delete your own account.'}, status=400)

		ok, error_response = _delete_supabase_user(user.supabase_id)
		if not ok:
			return error_response

		user.delete()
		return JsonResponse({'detail': 'User deleted successfully.'}, status=200)

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
	and issues a local AuthToken for OAuth login.
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

	if password and not user.password_hash:
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


@csrf_exempt
def send_verification(request):
	"""POST — send/resend email verification link."""
	if request.method == 'OPTIONS':
		return JsonResponse({'detail': 'OK'}, status=200)

	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	if actor.email_verified:
		return JsonResponse({'detail': 'Email is already verified.'})

	try:
		token = EmailToken.create_for(actor, EmailToken.PURPOSE_VERIFY)
		sent = send_verification_email(actor, token)
		if not sent:
			return JsonResponse({'detail': 'Email service could not send the verification email.'}, status=503)
	except Exception:
		logger.exception('Failed to send verification email for user_id=%s', actor.id)
		return JsonResponse({'detail': 'Email service is temporarily unavailable.'}, status=503)

	return JsonResponse({'detail': 'Verification email sent.'})


@csrf_exempt
def verify_email(request):
	"""POST { "token": "..." } — verify email address."""
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	key = (payload.get('token') or '').strip()
	if not key:
		return JsonResponse({'detail': 'token is required.'}, status=400)

	token = EmailToken.objects.filter(key=key, purpose=EmailToken.PURPOSE_VERIFY).first()
	if not token or not token.is_valid():
		return JsonResponse({'detail': 'Invalid or expired verification link.'}, status=400)

	user = token.user
	token.is_used = True
	token.save(update_fields=['is_used'])

	if not user.email_verified:
		user.email_verified = True
		updates = ['email_verified']
		if user.role == PlatformUser.ROLE_GENERAL:
			user.role = PlatformUser.ROLE_VERIFIED
			updates.append('role')
		user.save(update_fields=updates)

	return JsonResponse({'detail': 'Email verified successfully.', **_user_payload(user)})


@csrf_exempt
def forgot_password(request):
	"""POST { "email": "..." } — send password reset link."""
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	email = _normalize_email(payload.get('email'))
	if not email:
		return JsonResponse({'detail': 'email is required.'}, status=400)

	# Always return success to prevent email enumeration
	user = PlatformUser.objects.filter(email__iexact=email, is_active=True).first()
	if user:
		try:
			token = EmailToken.create_for(user, EmailToken.PURPOSE_RESET, ttl_hours=1)
			send_password_reset_email(user, token)
		except Exception:
			logger.exception('Failed to send password reset email for user_id=%s', user.id)

	return JsonResponse({'detail': 'If that email exists, a reset link has been sent.'})


@csrf_exempt
def reset_password(request):
	"""POST { "token": "...", "password": "..." } — reset password with token."""
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	key = (payload.get('token') or '').strip()
	new_password = (payload.get('password') or '').strip()
	if not key or not new_password:
		return JsonResponse({'detail': 'token and password are required.'}, status=400)

	if len(new_password) < 6:
		return JsonResponse({'detail': 'Password must be at least 6 characters.'}, status=400)

	token = EmailToken.objects.filter(key=key, purpose=EmailToken.PURPOSE_RESET).first()
	if not token or not token.is_valid():
		return JsonResponse({'detail': 'Invalid or expired reset link.'}, status=400)

	user = token.user
	token.is_used = True
	token.save(update_fields=['is_used'])

	user.password_hash = make_password(new_password)
	user.save(update_fields=['password_hash'])

	return JsonResponse({'detail': 'Password has been reset. You can now log in.'})


@csrf_exempt
def change_password(request):
	"""POST { "current_password": "...", "new_password": "..." } — change password (authenticated)."""
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed.'}, status=405)

	actor = get_authenticated_user(request)
	if not actor:
		return JsonResponse({'detail': 'Authentication required.'}, status=401)

	try:
		payload = json.loads(request.body or '{}')
	except json.JSONDecodeError:
		return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

	current = (payload.get('current_password') or '').strip()
	new_pw = (payload.get('new_password') or '').strip()

	if not current or not new_pw:
		return JsonResponse({'detail': 'current_password and new_password are required.'}, status=400)

	if len(new_pw) < 6:
		return JsonResponse({'detail': 'New password must be at least 6 characters.'}, status=400)

	if not check_password(current, actor.password_hash):
		return JsonResponse({'detail': 'Current password is incorrect.'}, status=401)

	actor.password_hash = make_password(new_pw)
	actor.save(update_fields=['password_hash'])
	return JsonResponse({'detail': 'Password changed successfully.'})
