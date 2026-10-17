from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("examinations", "0003_cohort_candidate_access"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ExamAdminVerification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_hash", models.CharField(max_length=64, unique=True)),
                ("email", models.EmailField(max_length=254)),
                ("code_hash", models.CharField(blank=True, max_length=64)),
                ("expires_at", models.DateTimeField(null=True)),
                ("sent_at", models.DateTimeField(null=True)),
                ("failed_attempts", models.PositiveSmallIntegerField(default=0)),
                ("verified_until", models.DateTimeField(null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
