from django.urls import path

from .views import comment_detail, comments_collection, report_post, reports_collection, vote_on_post

urlpatterns = [
    path('posts/<int:post_id>/vote/', vote_on_post, name='vote-on-post'),
    path('posts/<int:post_id>/report/', report_post, name='report-post'),
    path('posts/<int:post_id>/comments/', comments_collection, name='comments-collection'),
    path('comments/<int:comment_id>/', comment_detail, name='comment-detail'),
    path('reports/', reports_collection, name='reports-collection'),
]
