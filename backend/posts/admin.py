from django.contrib import admin

from .models import Post, Topic


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
	list_display = ('id', 'name', 'parent', 'created_at')
	search_fields = ('name',)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
	list_display = ('id', 'title', 'author', 'topic', 'is_deleted', 'created_at')
	list_filter = ('is_deleted', 'topic')
	search_fields = ('title', 'content', 'author__username')
