from decimal import Decimal
from rest_framework import serializers


class OptionInput(serializers.Serializer):
    text = serializers.CharField(max_length=3000)
    is_correct = serializers.BooleanField(default=False)


class QuestionInput(serializers.Serializer):
    text = serializers.CharField(max_length=20000)
    question_type = serializers.ChoiceField(choices=["MULTIPLE_CHOICE"], default="MULTIPLE_CHOICE")
    marks = serializers.DecimalField(max_digits=7, decimal_places=2, min_value=Decimal("0.01"), max_value=1000)
    explanation = serializers.CharField(max_length=10000, allow_blank=True, default="")
    category = serializers.CharField(max_length=150, allow_blank=True, default="")
    difficulty = serializers.ChoiceField(choices=["EASY", "MEDIUM", "HARD"], default="MEDIUM")
    is_active = serializers.BooleanField(default=True)
    options = OptionInput(many=True, min_length=2, max_length=10)

    def validate_options(self, value):
        if sum(option["is_correct"] for option in value) != 1:
            raise serializers.ValidationError("Exactly one option must be correct.")
        return value


class ExamInput(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    instructions = serializers.CharField(max_length=20000, allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1, max_value=480)
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    pass_mark = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    maximum_attempts = serializers.IntegerField(min_value=1, max_value=20)
    question_count = serializers.IntegerField(min_value=1, max_value=300)
    randomize_questions = serializers.BooleanField(default=True)
    randomize_options = serializers.BooleanField(default=True)
    select_from_bank = serializers.BooleanField(default=False)
    result_release = serializers.ChoiceField(choices=["IMMEDIATE", "MANUAL_REVIEW", "SCHEDULED"])
    release_at = serializers.DateTimeField(allow_null=True, default=None)
    is_active = serializers.BooleanField(default=False)
    question_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=1000)

    def validate(self, data):
        # This is a portal-wide fairness policy rather than an administrator
        # preference. The service repeats this enforcement for trusted callers.
        data["randomize_questions"] = True
        if data["ends_at"] <= data["starts_at"]:
            raise serializers.ValidationError("The end time must be after the start time.")
        if data["result_release"] == "SCHEDULED" and not data.get("release_at"):
            raise serializers.ValidationError("A scheduled result release needs a release time.")
        if len(set(data["question_ids"])) != len(data["question_ids"]):
            raise serializers.ValidationError("Do not select a question more than once.")
        if data["question_count"] > len(data["question_ids"]):
            raise serializers.ValidationError("There are not enough selected questions.")
        if not data["select_from_bank"] and data["question_count"] != len(data["question_ids"]):
            raise serializers.ValidationError("Select from bank must be enabled to use a subset of questions.")
        return data


class AnswerInput(serializers.Serializer):
    question_id = serializers.UUIDField()
    option_id = serializers.UUIDField()
    base_revision = serializers.IntegerField(min_value=0)


class AssignmentInput(serializers.Serializer):
    # `identifier` retains the old account-assignment API during transition;
    # the CMS uses full_name for all new cohort candidates.
    full_name = serializers.CharField(max_length=300, required=False, allow_blank=True)
    identifier = serializers.CharField(max_length=255, required=False, allow_blank=True)
    is_active = serializers.BooleanField(default=True)
    issue_new_code = serializers.BooleanField(default=False)

    def validate_full_name(self, value):
        normalized = " ".join(value.split())
        if normalized and len(normalized.split()) < 2:
            raise serializers.ValidationError("Enter the student's first name followed by their last name.")
        return normalized

    def validate(self, data):
        if not data.get("full_name") and not data.get("identifier") and not data.get("issue_new_code"):
            raise serializers.ValidationError("Enter the student's full name or create a cohort code.")
        return data


class CandidateAccessInput(serializers.Serializer):
    full_name = serializers.CharField(max_length=300)
    email = serializers.EmailField(max_length=254)
    access_code = serializers.CharField(max_length=100)

    def validate_full_name(self, value):
        normalized = " ".join(value.split())
        if len(normalized.split()) < 2:
            raise serializers.ValidationError("Enter your first name followed by your last name.")
        return normalized


class QuestionViewedInput(serializers.Serializer):
    question_id = serializers.UUIDField()


class AttemptFilters(serializers.Serializer):
    exam = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=["IN_PROGRESS", "SUBMITTED", "EXPIRED", "CANCELLED"], required=False)


class ExportFilters(serializers.Serializer):
    exam = serializers.UUIDField()
