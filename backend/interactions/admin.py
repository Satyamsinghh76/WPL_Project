from django.contrib import admin

from .models import Report, Vote


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
