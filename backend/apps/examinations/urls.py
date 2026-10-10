from django.urls import path
from . import views

urlpatterns = [
    path("exams/candidate/access/", views.CandidateAccess.as_view()),
    path("exams/candidate/sign-out/", views.CandidateSignOut.as_view()),
    path("exams/available/", views.AvailableExams.as_view()),
    path("exams/<uuid:exam_id>/start/", views.StartExam.as_view()),
    path("exam-attempts/<uuid:attempt_id>/", views.AttemptDetail.as_view()),
    path("exam-attempts/<uuid:attempt_id>/questions/", views.AttemptQuestions.as_view()),
    path("exam-attempts/<uuid:attempt_id>/answers/", views.SaveAnswer.as_view()),
    path("exam-attempts/<uuid:attempt_id>/viewed/", views.QuestionViewed.as_view()),
    path("exam-attempts/<uuid:attempt_id>/submit/", views.SubmitAttempt.as_view()),
    path("exam-attempts/<uuid:attempt_id>/result/", views.AttemptResult.as_view()),
    path("exams/staff/exams/", views.StaffExams.as_view()),
    path("exams/staff/exams/<uuid:exam_id>/", views.StaffExamDetail.as_view()),
    path("exams/staff/exams/<uuid:exam_id>/eligibility/", views.StaffEligibility.as_view()),
    path("exams/staff/exams/<uuid:exam_id>/eligibility/<int:eligibility_id>/", views.StaffEligibilityDetail.as_view()),
    path("exams/staff/questions/", views.StaffQuestions.as_view()),
    path("exams/staff/questions/<uuid:question_id>/", views.StaffQuestionDetail.as_view()),
    path("exams/staff/attempts/", views.StaffAttempts.as_view()),
    path("exams/staff/attempts/<uuid:attempt_id>/", views.StaffAttemptReview.as_view()),
    path("exams/staff/attempts/<uuid:attempt_id>/release/", views.StaffRelease.as_view()),
    path("exams/staff/results/export/", views.StaffExport.as_view()),
]
