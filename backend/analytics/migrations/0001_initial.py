from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0007_platformuser_email_ci_unique'),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('visit', 'Visit'), ('login', 'Login'), ('post_created', 'Post Created'), ('vote', 'Vote'), ('evidence_review', 'Evidence Review')], db_index=True, max_length=32)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('metadata', models.JSONField(blank=True, null=True)),
                ('user', models.ForeignKey(blank=True, db_index=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='analytics_events', to='accounts.platformuser')),
            ],
            options={
                'ordering': ['timestamp'],
                'indexes': [models.Index(fields=['timestamp', 'event_type'], name='analytics_ev_timesta_f95ef2_idx'), models.Index(fields=['user', 'timestamp'], name='analytics_ev_user_id_7ecad0_idx')],
            },
        ),
    ]
