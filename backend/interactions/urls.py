from django.urls import path

from .views import report_post, reports_collection, vote_on_post

urlpatterns = [
    path('posts/<int:post_id>/vote/', vote_on_post, name='vote-on-post'),
    path('posts/<int:post_id>/report/', report_post, name='report-post'),
    path('reports/', reports_collection, name='reports-collection'),
]
