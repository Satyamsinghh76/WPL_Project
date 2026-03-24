from django.urls import path

from .views import post_detail, posts_collection

urlpatterns = [
    path('posts/', posts_collection, name='posts-collection'),
    path('posts/<int:post_id>/', post_detail, name='post-detail'),
]
