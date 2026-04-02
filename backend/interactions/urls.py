from django.urls import path

from .views import (
    comment_detail, comments_collection, conversation_messages,
    conversations_list, report_post, report_user, reports_collection,
    topic_rooms, unread_count, vote_on_post,
)

urlpatterns = [
    path('posts/<int:post_id>/vote/', vote_on_post, name='vote-on-post'),
    path('posts/<int:post_id>/report/', report_post, name='report-post'),
    path('users/<int:user_id>/report/', report_user, name='report-user'),
    path('posts/<int:post_id>/comments/', comments_collection, name='comments-collection'),
    path('comments/<int:comment_id>/', comment_detail, name='comment-detail'),
    path('reports/', reports_collection, name='reports-collection'),
    path('conversations/', conversations_list, name='conversations-list'),
    path('conversations/unread/', unread_count, name='unread-count'),
    path('conversations/<int:convo_id>/messages/', conversation_messages, name='conversation-messages'),
    path('topic-rooms/', topic_rooms, name='topic-rooms'),
]
