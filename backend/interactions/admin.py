from django.contrib import admin

from .models import Comment, CommentVote, Report, Vote


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'post', 'value', 'created_at')
	list_filter = ('value',)
	search_fields = ('user__username', 'post__title')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
	list_display = ('id', 'target_type', 'reporter', 'post', 'reported_user', 'status', 'created_at')
	list_filter = ('status', 'target_type')
	search_fields = ('reason', 'reporter__username', 'post__title', 'reported_user__username')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
	list_display = ('id', 'author', 'post', 'is_deleted', 'created_at')
	list_filter = ('is_deleted',)
	search_fields = ('author__username', 'post__title', 'content')


@admin.register(CommentVote)
class CommentVoteAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'comment', 'value', 'created_at')
	list_filter = ('value',)
	search_fields = ('user__username', 'comment__content', 'comment__post__title')
