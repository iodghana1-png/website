from django.db import migrations
from django.db.models import Q


def remove_synthetic_load_tests(apps, schema_editor):
    """Remove the deliberately labelled, non-production load-test records only."""
    AuditLog = apps.get_model("audit", "AuditLog")
    Exam = apps.get_model("examinations", "Exam")
    ExamAnswer = apps.get_model("examinations", "ExamAnswer")
    ExamAttempt = apps.get_model("examinations", "ExamAttempt")
    ExamAuditLog = apps.get_model("examinations", "ExamAuditLog")
    ExamCandidateSession = apps.get_model("examinations", "ExamCandidateSession")
    ExamEligibility = apps.get_model("examinations", "ExamEligibility")
    ExamQuestion = apps.get_model("examinations", "ExamQuestion")
    ExamResult = apps.get_model("examinations", "ExamResult")
    ExamVersion = apps.get_model("examinations", "ExamVersion")

    # This label was used exclusively for the 120/200-candidate production
    # load tests. Do not broaden this filter: real examinations must never be
    # removed by a deployment migration.
    for exam in Exam.objects.filter(
        title__startswith="SYSTEM LOAD TEST ",
        title__endswith=" DO NOT USE",
    ).iterator():
        attempt_ids = list(ExamAttempt.objects.filter(exam_id=exam.pk).values_list("pk", flat=True))
        eligibility_ids = list(ExamEligibility.objects.filter(exam_id=exam.pk).values_list("pk", flat=True))
        version_ids = list(ExamVersion.objects.filter(exam_id=exam.pk).values_list("pk", flat=True))

        AuditLog.objects.filter(
            Q(target_type="exam", target_id=exam.pk)
            | Q(target_type="exam_attempt", target_id__in=attempt_ids)
        ).delete()
        ExamAuditLog.objects.filter(
            Q(exam_id=exam.pk) | Q(attempt_id__in=attempt_ids)
        ).delete()
        ExamResult.objects.filter(attempt_id__in=attempt_ids).delete()
        ExamAnswer.objects.filter(attempt_id__in=attempt_ids).delete()
        ExamCandidateSession.objects.filter(eligibility_id__in=eligibility_ids).delete()
        ExamAttempt.objects.filter(pk__in=attempt_ids).delete()
        ExamEligibility.objects.filter(pk__in=eligibility_ids).delete()
        ExamQuestion.objects.filter(version_id__in=version_ids).delete()
        Exam.objects.filter(pk=exam.pk).update(current_version=None)
        ExamVersion.objects.filter(pk__in=version_ids).delete()
        Exam.objects.filter(pk=exam.pk).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
        ("examinations", "0004_examadminverification"),
    ]

    operations = [
        migrations.RunPython(remove_synthetic_load_tests, migrations.RunPython.noop),
    ]
