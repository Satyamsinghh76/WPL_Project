from django.contrib import admin

from .models import Comment, Report, Vote


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'post', 'value', 'created_at')
	list_filter = ('value',)
	search_fields = ('user__username', 'post__title')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
	list_display = ('id', 'reporter', 'post', 'status', 'created_at')
	list_filter = ('status',)
	search_fields = ('reason', 'reporter__username', 'post__title')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
	list_display = ('id', 'author', 'post', 'is_deleted', 'created_at')
	list_filter = ('is_deleted',)
	search_fields = ('author__username', 'post__title', 'content')
