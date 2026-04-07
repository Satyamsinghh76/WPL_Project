from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_platformuser_email_ci_unique'),
        ('interactions', '0007_rename_interactions_comment_post_created_idx_interaction_post_id_a6e852_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommentVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.SmallIntegerField(choices=[(1, 'Upvote'), (-1, 'Downvote')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('comment', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='interactions.comment')),
                ('user', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='comment_votes', to='accounts.platformuser')),
            ],
            options={
                'unique_together': {('user', 'comment')},
            },
        ),
        migrations.AddIndex(
            model_name='commentvote',
            index=models.Index(fields=['comment'], name='commentvote_comment_idx'),
        ),
    ]