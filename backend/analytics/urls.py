from django.urls import path

from .views import analytics_summary, analytics_timeseries, top_contributors, track_visit


urlpatterns = [
    path('', analytics_timeseries, name='analytics-timeseries'),
    path('summary/', analytics_summary, name='analytics-summary'),
    path('contributors/', top_contributors, name='analytics-contributors'),
    path('track-visit/', track_visit, name='analytics-track-visit'),
]
