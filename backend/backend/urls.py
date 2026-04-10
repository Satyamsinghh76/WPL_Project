from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path


def health(request):
    # Return an empty response so uptime pings do not transfer unnecessary data.
    return HttpResponse(status=204)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health, name='health'),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('posts.urls')),
    path('api/', include('interactions.urls')),
]


#     path('api/health/', health, name='api_health'),
