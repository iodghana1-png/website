import io
from unittest.mock import patch
from xml.sax.saxutils import escape
from zipfile import ZipFile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import Question
from .tests import ExamFixtures


def document(*lines):
    paragraphs = ''.join(f'<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>' for line in lines)
    xml = f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{paragraphs}</w:body></w:document>'
    content = io.BytesIO()
    with ZipFile(content, 'w') as archive:
        archive.writestr('word/document.xml', xml)
    return SimpleUploadedFile('questions.docx', content.getvalue())


class WordImportTests(ExamFixtures, TestCase):
    def test_word_numbered_list_requires_manual_answers(self):
        word = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        def paragraph(text, num=None):
            prop = f'<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num}"/></w:numPr></w:pPr>' if num else ''
            return f'<w:p>{prop}<w:r><w:t>{escape(text)}</w:t></w:r></w:p>'
        xml = f'<w:document xmlns:w="{word}"><w:body>' + ''.join([
            paragraph('Instructions', '3'), paragraph('QUESTIONS'),
            paragraph('First question?', '1'), paragraph('Yes', '2'), paragraph('No', '2'),
            paragraph('Second question?', '1'), paragraph('Yes', '2'), paragraph('No', '2'),
        ]) + '</w:body></w:document>'
        numbering = f'<w:numbering xmlns:w="{word}"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="upperLetter"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>'
        content = io.BytesIO()
        with ZipFile(content, 'w') as archive:
            archive.writestr('word/document.xml', xml)
            archive.writestr('word/numbering.xml', numbering)
        staff = self.client_for(self.staff)
        response = staff.post('/api/v1/exams/staff/questions/import/preview/', {'file': SimpleUploadedFile('numbered.docx', content.getvalue())})
        self.assertEqual(response.status_code, 200, response.content)
        questions = response.json()['questions']
        self.assertEqual(len(questions), 2)
        self.assertFalse(any(option['is_correct'] for question in questions for option in question['options']))
        self.assertEqual(self.post('exams/staff/questions/import/', {'questions': questions}, staff).status_code, 400)
        questions[0]['options'][0]['is_correct'] = True
        questions[1]['options'][1]['is_correct'] = True
        self.assertEqual(self.post('exams/staff/questions/import/', {'questions': questions}, staff).status_code, 201)

    def test_preview_and_atomic_import(self):
        staff = self.client_for(self.staff)
        response = staff.post('/api/v1/exams/staff/questions/import/preview/', {'file': document(
            'Question: Who oversees governance?', 'A. Board', 'B. Visitors', 'Answer: A', 'Marks: 2',
            'Question: Choose the principle', 'A. Secrecy', 'B. Accountability', 'Answer: B',
        )})
        self.assertEqual(response.status_code, 200, response.content)
        questions = response.json()['questions']
        self.assertEqual(len(questions), 2)
        self.assertTrue(questions[1]['options'][1]['is_correct'])
        self.assertEqual(questions[1]['marks'], '1.00')
        count = Question.objects.count()
        self.assertEqual(count, 1)  # Preview does not save anything.
        response = self.post('exams/staff/questions/import/', {'questions': questions}, staff)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Question.objects.count(), count + 2)

    def test_invalid_document_and_batch_do_not_save(self):
        staff = self.client_for(self.staff)
        response = staff.post('/api/v1/exams/staff/questions/import/preview/', {'file': document('Question: Test', 'A. Yes', 'B. No', 'Answer: C')})
        self.assertEqual(response.status_code, 400)
        valid = {'text': 'Valid', 'marks': '1', 'options': [{'text': 'Yes', 'is_correct': True}, {'text': 'No', 'is_correct': False}]}
        with patch('apps.examinations.views.save_question') as save:
            response = self.post('exams/staff/questions/import/', {'questions': [valid, {**valid, 'text': ''}]}, staff)
        self.assertEqual(response.status_code, 400)
        save.assert_not_called()

    def test_import_requires_verified_exam_admin(self):
        response = self.client.post('/api/v1/exams/staff/questions/import/preview/', {'file': document('Question: Test', 'A. Yes', 'B. No', 'Answer: A')})
        self.assertEqual(response.status_code, 403)
