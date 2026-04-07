from django.urls import path

from .views import post_detail, post_visibility, posts_collection, topics_collection

urlpatterns = [
    path('topics/', topics_collection, name='topics-collection'),
    path('posts/', posts_collection, name='posts-collection'),
    path('posts/<int:post_id>/', post_detail, name='post-detail'),
    path('posts/<int:post_id>/visibility/', post_visibility, name='post-visibility'),
]
