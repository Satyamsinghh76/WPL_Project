from django.urls import path

from .views import post_detail, post_visibility, posts_collection, search_all, topics_collection

urlpatterns = [
    path('topics/', topics_collection, name='topics-collection'),
    path('search/', search_all, name='search-all'),
    path('posts/', posts_collection, name='posts-collection'),
    path('posts/<int:post_id>/', post_detail, name='post-detail'),
    path('posts/<int:post_id>/visibility/', post_visibility, name='post-visibility'),
]
