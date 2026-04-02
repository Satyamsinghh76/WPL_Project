from django.db.models import Q, Sum
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from accounts.auth import get_authenticated_user, get_effective_role, parse_json_body
from accounts.models import PlatformUser
from posts.models import Post

from .models import Comment, Conversation, ConversationMember, Message, Report, Vote


@csrf_exempt
def vote_on_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    payload = parse_json_body(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)
    user_role = get_effective_role(request, user)

    value = payload.get('value')
    if value not in [Vote.UPVOTE, Vote.DOWNVOTE]:
        return JsonResponse({'detail': 'value (1 or -1) is required.'}, status=400)

    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if user_role == PlatformUser.ROLE_GENERAL:
        return JsonResponse({'detail': 'General users cannot vote. Upgrade to vote.', 'code': 'voting_not_allowed'}, status=403)

    Vote.objects.update_or_create(user=user, post=post, defaults={'value': value})
    score = Vote.objects.filter(post=post).aggregate(score=Sum('value'))['score'] or 0
    return JsonResponse({'post_id': post.id, 'score': score, 'user_vote': value})


@csrf_exempt
def report_post(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    payload = parse_json_body(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)
    user_role = get_effective_role(request, user)

    reason = payload.get('reason', '').strip()
    if not reason:
        return JsonResponse({'detail': 'reason is required.'}, status=400)

    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if user_role == PlatformUser.ROLE_GENERAL:
        return JsonResponse({'detail': 'General users cannot submit reports.', 'code': 'report_not_allowed'}, status=403)

    report = Report.objects.create(reporter=user, post=post, target_type=Report.TARGET_POST, reason=reason)
    return JsonResponse({'id': report.id, 'status': report.status}, status=201)


@csrf_exempt
def report_user(request, user_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    payload = parse_json_body(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)
    user_role = get_effective_role(request, user)

    reason = payload.get('reason', '').strip()
    if not reason:
        return JsonResponse({'detail': 'reason is required.'}, status=400)

    reported_user = PlatformUser.objects.filter(id=user_id, is_active=True).first()
    if not reported_user:
        return JsonResponse({'detail': 'User not found.'}, status=404)

    if user_role == PlatformUser.ROLE_GENERAL:
        return JsonResponse({'detail': 'General users cannot submit reports.', 'code': 'report_not_allowed'}, status=403)

    if reported_user.id == user.id:
        return JsonResponse({'detail': 'You cannot report your own account.'}, status=400)

    report = Report.objects.create(
        reporter=user,
        reported_user=reported_user,
        target_type=Report.TARGET_USER,
        reason=reason,
    )
    return JsonResponse({'id': report.id, 'status': report.status}, status=201)


def reports_collection(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    actor = get_authenticated_user(request)
    if not actor:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    actor_role = get_effective_role(request, actor)
    if actor_role not in [PlatformUser.ROLE_ADMIN, PlatformUser.ROLE_DEVELOPER, PlatformUser.ROLE_MODERATOR]:
        return JsonResponse({'detail': 'Admin, developer, or moderator access required.'}, status=403)

    reports = Report.objects.select_related('reporter', 'post', 'reported_user').all()
    results = []
    for report in reports:
        item = {
            'id': report.id,
            'target_type': report.target_type,
            'status': report.status,
            'reason': report.reason,
            'created_at': report.created_at.isoformat(),
            'reporter_id': report.reporter_id,
            'reporter_username': report.reporter.username,
        }
        if report.target_type == Report.TARGET_POST and report.post:
            item.update(
                {
                    'post_id': report.post_id,
                    'post_title': report.post.title,
                    'post_author_username': report.post.author.username,
                }
            )
        if report.target_type == Report.TARGET_USER and report.reported_user:
            item.update(
                {
                    'reported_user_id': report.reported_user_id,
                    'reported_username': report.reported_user.username,
                    'reported_full_name': report.reported_user.full_name,
                }
            )
        results.append(item)

    return JsonResponse({'results': results})


@csrf_exempt
def comments_collection(request, post_id):
    post = Post.objects.filter(id=post_id, is_deleted=False).first()
    if not post:
        return JsonResponse({'detail': 'Post not found.'}, status=404)

    if request.method == 'GET':
        comments = (
            Comment.objects.filter(post=post, is_deleted=False)
            .select_related('author')
            .values('id', 'content', 'created_at', 'updated_at', 'author_id', 'author__username')
        )
        return JsonResponse({'results': list(comments)})

    if request.method == 'POST':
        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)
        actor_role = get_effective_role(request, actor)
        if actor_role == PlatformUser.ROLE_GENERAL:
            return JsonResponse({'detail': 'General users cannot comment.'}, status=403)

        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        content = (payload.get('content') or '').strip()
        if not content:
            return JsonResponse({'detail': 'content is required.'}, status=400)

        comment = Comment.objects.create(author=actor, post=post, content=content)
        return JsonResponse(
            {
                'id': comment.id,
                'content': comment.content,
                'created_at': comment.created_at.isoformat(),
                'updated_at': comment.updated_at.isoformat(),
                'author_id': actor.id,
                'author__username': actor.username,
            },
            status=201,
        )

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def comment_detail(request, comment_id):
    comment = Comment.objects.select_related('author').filter(id=comment_id, is_deleted=False).first()
    if not comment:
        return JsonResponse({'detail': 'Comment not found.'}, status=404)

    if request.method == 'DELETE':
        actor = get_authenticated_user(request)
        if not actor:
            return JsonResponse({'detail': 'Authentication required.'}, status=401)
        actor_role = get_effective_role(request, actor)

        if actor.id != comment.author_id and actor_role not in [
            PlatformUser.ROLE_ADMIN,
            PlatformUser.ROLE_DEVELOPER,
            PlatformUser.ROLE_MODERATOR,
        ]:
            return JsonResponse({'detail': 'You do not have permission to delete this comment.'}, status=403)

        comment.is_deleted = True
        comment.save(update_fields=['is_deleted'])
        return JsonResponse({'detail': 'Comment deleted.'})

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


# ============ CHAT ============

def _convo_payload(convo, actor):
    """Build a conversation JSON dict for the given actor."""
    members = list(convo.members.select_related('user').all())
    member_obj = next((m for m in members if m.user_id == actor.id), None)
    last_msg = convo.messages.order_by('-created_at').first()

    # Unread = messages after this member's last_read_at
    unread = 0
    if member_obj:
        qs = convo.messages.exclude(sender=actor)
        if member_obj.last_read_at:
            qs = qs.filter(created_at__gt=member_obj.last_read_at)
        unread = qs.count()

    result = {
        'id': convo.id,
        'conv_type': convo.conv_type,
        'name': convo.name,
        'topic_id': convo.topic_id,
        'last_message': {
            'content': last_msg.content,
            'sender_id': last_msg.sender_id,
            'sender_username': last_msg.sender.username,
            'created_at': last_msg.created_at.isoformat(),
        } if last_msg else None,
        'unread_count': unread,
        'updated_at': convo.updated_at.isoformat(),
        'member_count': len(members),
    }

    if convo.conv_type == Conversation.TYPE_DIRECT:
        other = next((m.user for m in members if m.user_id != actor.id), None)
        if other:
            result['other_user'] = {
                'id': other.id,
                'username': other.username,
                'full_name': other.full_name,
                'profile_picture': other.profile_picture,
            }
    else:
        result['members'] = [
            {
                'id': m.user.id,
                'username': m.user.username,
                'full_name': m.user.full_name,
                'profile_picture': m.user.profile_picture,
            }
            for m in members
        ]

    return result


def _find_direct_conversation(user_a, user_b):
    """Find an existing DM between two users."""
    return Conversation.objects.filter(
        conv_type=Conversation.TYPE_DIRECT,
        members__user=user_a,
    ).filter(
        members__user=user_b,
    ).first()


@csrf_exempt
def conversations_list(request):
    """GET: list conversations. POST: start a DM or group chat."""
    actor = get_authenticated_user(request)
    if not actor:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    if request.method == 'GET':
        conv_type = request.GET.get('type', '')
        convo_ids = ConversationMember.objects.filter(user=actor).values_list('conversation_id', flat=True)
        convos = Conversation.objects.filter(id__in=convo_ids).select_related('topic')
        if conv_type:
            convos = convos.filter(conv_type=conv_type)

        results = [_convo_payload(c, actor) for c in convos]
        return JsonResponse({'results': results})

    if request.method == 'POST':
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        conv_type = payload.get('conv_type', Conversation.TYPE_DIRECT)

        if conv_type == Conversation.TYPE_DIRECT:
            user_id = payload.get('user_id')
            if not user_id:
                return JsonResponse({'detail': 'user_id is required.'}, status=400)
            other_user = PlatformUser.objects.filter(id=user_id, is_active=True).first()
            if not other_user:
                return JsonResponse({'detail': 'User not found.'}, status=404)
            if other_user.id == actor.id:
                return JsonResponse({'detail': 'Cannot message yourself.'}, status=400)

            convo = _find_direct_conversation(actor, other_user)
            if not convo:
                convo = Conversation.objects.create(conv_type=Conversation.TYPE_DIRECT, created_by=actor)
                ConversationMember.objects.create(conversation=convo, user=actor)
                ConversationMember.objects.create(conversation=convo, user=other_user)

            return JsonResponse(_convo_payload(convo, actor), status=201)

        if conv_type == Conversation.TYPE_GROUP:
            name = (payload.get('name') or '').strip()
            member_ids = payload.get('member_ids', [])
            if not name:
                return JsonResponse({'detail': 'name is required for group chats.'}, status=400)
            if len(member_ids) < 1:
                return JsonResponse({'detail': 'At least one other member is required.'}, status=400)

            convo = Conversation.objects.create(conv_type=Conversation.TYPE_GROUP, name=name, created_by=actor)
            ConversationMember.objects.create(conversation=convo, user=actor)
            for uid in member_ids:
                u = PlatformUser.objects.filter(id=uid, is_active=True).first()
                if u and u.id != actor.id:
                    ConversationMember.objects.get_or_create(conversation=convo, user=u)

            return JsonResponse(_convo_payload(convo, actor), status=201)

        return JsonResponse({'detail': f'Invalid conv_type: {conv_type}'}, status=400)

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


@csrf_exempt
def conversation_messages(request, convo_id):
    """GET: list messages. POST: send a message."""
    actor = get_authenticated_user(request)
    if not actor:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    membership = ConversationMember.objects.filter(conversation_id=convo_id, user=actor).first()
    if not membership:
        return JsonResponse({'detail': 'Conversation not found.'}, status=404)

    convo = membership.conversation

    if request.method == 'GET':
        membership.last_read_at = timezone.now()
        membership.save(update_fields=['last_read_at'])

        messages = convo.messages.select_related('sender').all()
        results = [
            {
                'id': msg.id,
                'sender_id': msg.sender_id,
                'sender_username': msg.sender.username,
                'sender_picture': msg.sender.profile_picture,
                'content': msg.content,
                'created_at': msg.created_at.isoformat(),
            }
            for msg in messages
        ]
        return JsonResponse({'results': results})

    if request.method == 'POST':
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        content = (payload.get('content') or '').strip()
        if not content:
            return JsonResponse({'detail': 'content is required.'}, status=400)

        msg = Message.objects.create(conversation=convo, sender=actor, content=content)
        convo.updated_at = timezone.now()
        convo.save(update_fields=['updated_at'])
        membership.last_read_at = timezone.now()
        membership.save(update_fields=['last_read_at'])

        return JsonResponse({
            'id': msg.id,
            'sender_id': msg.sender_id,
            'sender_username': actor.username,
            'sender_picture': actor.profile_picture,
            'content': msg.content,
            'created_at': msg.created_at.isoformat(),
        }, status=201)

    return JsonResponse({'detail': 'Method not allowed.'}, status=405)


def unread_count(request):
    """GET: total unread message count for current user."""
    actor = get_authenticated_user(request)
    if not actor:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    total = 0
    memberships = ConversationMember.objects.filter(user=actor).select_related('conversation')
    for m in memberships:
        qs = m.conversation.messages.exclude(sender=actor)
        if m.last_read_at:
            qs = qs.filter(created_at__gt=m.last_read_at)
        total += qs.count()

    return JsonResponse({'unread_count': total})


@csrf_exempt
def topic_rooms(request):
    """GET: list topic chat rooms. POST: join a topic room."""
    actor = get_authenticated_user(request)
    if not actor:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    if request.method == 'GET':
        from posts.models import Topic
        rooms = Conversation.objects.filter(conv_type=Conversation.TYPE_TOPIC).select_related('topic')
        my_ids = set(
            ConversationMember.objects.filter(user=actor, conversation__conv_type=Conversation.TYPE_TOPIC)
            .values_list('conversation_id', flat=True)
        )
        results = []
        for room in rooms:
            results.append({
                'id': room.id,
                'name': room.name,
                'topic_id': room.topic_id,
                'topic_name': room.topic.name if room.topic else '',
                'member_count': room.members.count(),
                'joined': room.id in my_ids,
                'updated_at': room.updated_at.isoformat(),
            })
        return JsonResponse({'results': results})

    if request.method == 'POST':
        payload = parse_json_body(request)
        if payload is None:
            return JsonResponse({'detail': 'Invalid JSON payload.'}, status=400)

        topic_id = payload.get('topic_id')
        if not topic_id:
            return JsonResponse({'detail': 'topic_id is required.'}, status=400)

        from posts.models import Topic
        topic = Topic.objects.filter(id=topic_id).first()
        if not topic:
            return JsonResponse({'detail': 'Topic not found.'}, status=404)

        # Get or create the room for this topic
        convo, created = Conversation.objects.get_or_create(
            conv_type=Conversation.TYPE_TOPIC,
            topic=topic,
            defaults={'name': topic.name, 'created_by': actor},
        )
        ConversationMember.objects.get_or_create(conversation=convo, user=actor)

        return JsonResponse(_convo_payload(convo, actor), status=201 if created else 200)
