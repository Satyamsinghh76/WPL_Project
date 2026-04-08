from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0007_post_media_items'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='content_type',
            field=models.CharField(
                choices=[
                    ('question', 'Question'),
                    ('theory', 'Theory'),
                    ('experiment', 'Experiment'),
                    ('claim', 'Claim'),
                    ('review', 'Review'),
                    ('concept', 'Concept (explained)'),
                    ('other', 'Other'),
                ],
                db_index=True,
                default='other',
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['content_type', '-created_at'], name='posts_ct_created_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['topic', 'content_type', '-created_at'], name='posts_topic_ct_created_idx'),
        ),
    ]
