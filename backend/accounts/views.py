import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import PlatformUser


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

		required_fields = ['username', 'email', 'full_name']
		missing = [field for field in required_fields if not payload.get(field)]
		if missing:
			return JsonResponse({'detail': f"Missing fields: {', '.join(missing)}"}, status=400)

		user = PlatformUser.objects.create(
			username=payload['username'],
			email=payload['email'],
			full_name=payload['full_name'],
			institution=payload.get('institution', ''),
			bio=payload.get('bio', ''),
			role=payload.get('role', PlatformUser.ROLE_GENERAL),
		)
		return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role}, status=201)

	return JsonResponse({'detail': 'Method not allowed.'}, status=405)
