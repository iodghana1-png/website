"""Read a deliberately simple, text-only Word question template."""
import re
from collections import Counter
from zipfile import BadZipFile, ZipFile

from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException
from rest_framework.exceptions import ValidationError

from .serializers import QuestionInput

MAX_FILE_SIZE = 2 * 1024 * 1024
MAX_XML_SIZE = 8 * 1024 * 1024
MAX_QUESTIONS = 200
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def read_questions(upload):
    if not upload or not upload.name.lower().endswith('.docx'):
        raise ValidationError("Choose a Word .docx file.")
    if upload.size > MAX_FILE_SIZE:
        raise ValidationError("The Word file must be 2 MB or smaller.")
    try:
        with ZipFile(upload) as archive:
            entries = archive.infolist()
            if sum(entry.filename == 'word/document.xml' for entry in entries) != 1:
                raise ValueError()
            info = archive.getinfo('word/document.xml')
            if info.file_size > MAX_XML_SIZE or info.flag_bits & 1:
                raise ValueError()
            root = ElementTree.fromstring(archive.read(info))
            numbering = None
            if 'word/numbering.xml' in archive.namelist():
                info = archive.getinfo('word/numbering.xml')
                if info.file_size > MAX_XML_SIZE or info.flag_bits & 1:
                    raise ValueError()
                numbering = ElementTree.fromstring(archive.read(info))
    except (BadZipFile, KeyError, ValueError, OSError, RuntimeError, DefusedXmlException, ElementTree.ParseError):
        raise ValidationError("This file could not be read as a valid Word document.")
    body = root.find(W + 'body')
    if body is None:
        raise ValidationError("The Word document has no content.")
    if any(body.iter(W + 'tbl')) or any(body.iter(W + 'drawing')) or any(body.iter(W + 'pict')):
        raise ValidationError("Use text paragraphs only; tables and images cannot be imported.")

    paragraphs = list(body.iter(W + 'p'))
    if any(''.join(node.text or '' for node in p.iter(W + 't')).strip().upper() == 'QUESTIONS' for p in paragraphs):
        return read_numbered_questions(paragraphs, numbering)

    lines = []
    for paragraph in paragraphs:
        if paragraph.find('.//' + W + 'numPr') is not None:
            raise ValidationError("Type the question and option labels yourself; Word's automatic lists are not supported.")
        if any(paragraph.find('.//' + W + tag) is not None for tag in ('br', 'cr', 'tab')):
            raise ValidationError("Use a separate paragraph for each line; tabs and manual line breaks are not supported.")
        text = ''.join(node.text or '' for node in paragraph.iter(W + 't')).strip()
        if text:
            lines.append(text)
    questions, current = [], None

    def finish():
        if current is None:
            return
        labels = [label for label, _ in current['options']]
        if not current['answer'] or current['answer'] not in labels:
            raise ValidationError(f"Question {len(questions) + 1}: provide an Answer letter matching an option.")
        data = {'text': current['text'], 'marks': current['marks'], 'options': [
            {'text': text, 'is_correct': label == current['answer']} for label, text in current['options']
        ]}
        serializer = QuestionInput(data=data)
        if not serializer.is_valid():
            raise ValidationError(f"Question {len(questions) + 1}: check the question, marks, and 2 to 10 non-empty answer options.")
        questions.append(serializer.data)
        if len(questions) > MAX_QUESTIONS:
            raise ValidationError(f"A document can contain at most {MAX_QUESTIONS} questions.")

    for line in lines:
        question = re.fullmatch(r'Question(?:\s+\d+)?\s*:\s*(.+)', line, re.I)
        option = re.fullmatch(r'([A-J])[.)]\s+(.+)', line, re.I)
        answer = re.fullmatch(r'Answer\s*:\s*([A-J])', line, re.I)
        marks = re.fullmatch(r'Marks\s*:\s*(\S+)', line, re.I)
        if question:
            finish()
            current = {'text': question.group(1), 'options': [], 'answer': None, 'marks': '1', 'has_marks': False}
        elif current is None:
            raise ValidationError("Start each question with 'Question:'. See the example format.")
        elif option:
            label = option.group(1).upper()
            if label in [item[0] for item in current['options']]:
                raise ValidationError(f"Question {len(questions) + 1}: option {label} is repeated.")
            current['options'].append((label, option.group(2)))
        elif answer and not current['answer']:
            current['answer'] = answer.group(1).upper()
        elif marks and not current['has_marks']:
            current['marks'], current['has_marks'] = marks.group(1), True
        else:
            raise ValidationError(f"Question {len(questions) + 1}: unrecognized or repeated line: {line[:100]}")
    finish()
    if not questions:
        raise ValidationError("No questions found. See the example format.")
    return questions


def read_numbered_questions(paragraphs, numbering):
    """Read a numbered QUESTIONS section; answers must be chosen in review."""
    if numbering is None:
        raise ValidationError("The document's automatic numbering could not be read.")
    abstract = {}
    for item in numbering.findall(W + 'abstractNum'):
        levels = {}
        for level in item.findall(W + 'lvl'):
            fmt = level.find(W + 'numFmt')
            if fmt is not None:
                levels[level.get(W + 'ilvl')] = fmt.get(W + 'val')
        abstract[item.get(W + 'abstractNumId')] = levels
    formats = {}
    for item in numbering.findall(W + 'num'):
        ref = item.find(W + 'abstractNumId')
        if ref is not None:
            formats[item.get(W + 'numId')] = abstract.get(ref.get(W + 'val'), {})
    heading_seen = False
    rows = []
    for paragraph in paragraphs:
        text = ''.join(node.text or '' if node.tag == W + 't' else ' ' if node.tag in (W + 'tab', W + 'br', W + 'cr') else '' for node in paragraph.iter()).strip()
        if not text:
            continue
        if not heading_seen:
            if text.upper() == 'QUESTIONS':
                heading_seen = True
            continue
        num = paragraph.find('./' + W + 'pPr/' + W + 'numPr/' + W + 'numId')
        level = paragraph.find('./' + W + 'pPr/' + W + 'numPr/' + W + 'ilvl')
        if num is None:
            raise ValidationError("Every question and option after the QUESTIONS heading must use Word numbering. Check for extra text or unsupported formatting.")
        key = (num.get(W + 'val'), level.get(W + 'val') if level is not None else '0')
        rows.append((key, text))
    decimal_counts = Counter(key for key, _ in rows if formats.get(key[0], {}).get(key[1]) == 'decimal')
    if not decimal_counts:
        raise ValidationError("Could not identify the numbered questions. Check the document format.")
    question_key, count = decimal_counts.most_common(1)[0]
    if count < 2 or (len(decimal_counts) > 1 and decimal_counts.most_common(2)[1][1] >= count):
        raise ValidationError("Could not reliably identify the question numbering. Check the document format.")
    groups = []
    for key, text in rows:
        if key == question_key:
            groups.append({'text': text, 'options': []})
        elif not groups:
            raise ValidationError("Unexpected text before the first numbered question.")
        else:
            groups[-1]['options'].append({'text': text, 'is_correct': False})
    if not 1 <= len(groups) <= MAX_QUESTIONS:
        raise ValidationError(f"A document can contain at most {MAX_QUESTIONS} questions.")
    questions = []
    for index, group in enumerate(groups, 1):
        options = group['options']
        if options:
            options[0]['is_correct'] = True  # Validate shape only; never suggest an answer.
        serializer = QuestionInput(data={**group, 'marks': '1'})
        if not serializer.is_valid():
            raise ValidationError(f"Question {index}: check the text and ensure it has 2 to 10 options.")
        result = serializer.data
        for option in result['options']:
            option['is_correct'] = False
        questions.append(result)
    return questions
