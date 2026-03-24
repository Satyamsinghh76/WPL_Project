from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({'status': 'ok', 'framework': 'django'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health, name='health'),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('posts.urls')),
    path('api/', include('interactions.urls')),
]
