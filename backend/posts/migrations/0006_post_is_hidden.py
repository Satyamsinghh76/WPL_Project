from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0005_rename_posts_post_author_created_idx_posts_post_author__f8ea20_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='is_hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
