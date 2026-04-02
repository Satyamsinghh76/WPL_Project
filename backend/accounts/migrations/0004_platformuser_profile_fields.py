# Generated migration for adding new profile fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_platformuser_profile_picture_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformuser',
            name='tagline',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='platformuser',
            name='skills',
            field=models.TextField(blank=True, help_text='Comma-separated skills'),
        ),
        migrations.AddField(
            model_name='platformuser',
            name='links',
            field=models.TextField(blank=True, help_text='JSON: {linkedin, github, website, gscholar, etc}'),
        ),
        migrations.AddField(
            model_name='platformuser',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
