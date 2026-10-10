# Generated manually to keep the deployed schema change explicit and reviewable.

import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("examinations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="exameligibility",
            name="candidate_code_hash",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="exameligibility",
            name="candidate_code_issued_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="ExamCandidateSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("eligibility", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="candidate_sessions", to="examinations.exameligibility")),
            ],
        ),
        migrations.AddIndex(
            model_name="examcandidatesession",
            index=models.Index(fields=["token_hash", "expires_at"], name="exam_candidate_token_expiry"),
        ),
    ]
