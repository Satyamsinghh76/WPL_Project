import json

from django.http import JsonResponse

from .models import AuthToken


def get_bearer_token(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.lower().startswith('bearer '):
        return None
    return auth_header.split(' ', 1)[1].strip()


def get_authenticated_user(request):
    token_key = get_bearer_token(request)
    if not token_key:
        return None

    token = AuthToken.objects.select_related('user').filter(key=token_key).first()
    if not token or not token.is_valid() or not token.user.is_active:
        return None

    return token.user


def parse_json_body(request):
    try:
        return json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return None


def unauthorized_response(detail='Authentication required.'):
    return JsonResponse({'detail': detail}, status=401)
