"""Register existing template copy as plain CMS fields; leave page design intact."""
from html.parser import HTMLParser
from urllib.request import urlopen
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.content.models import CMSPage, CMSPageSection


class CopyParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.fields = {}
        self.current = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'data-cms-image' in attrs and attrs.get('data-cms-src'):
            key = attrs['data-cms-image']
            self.fields[key] = {'key': key, 'label': 'Image: ' + attrs.get('alt', 'Page image'), 'value': attrs['data-cms-src'], 'kind': 'image'}
        if 'data-cms-link' in attrs and attrs.get('data-cms-href'):
            key = attrs['data-cms-link']
            self.fields[key] = {'key': key, 'label': attrs.get('data-cms-link-label') or 'Link destination', 'value': attrs['data-cms-href'], 'kind': 'link'}
        if 'data-cms-copy' in attrs:
            self.current = (attrs['data-cms-copy'], attrs.get('data-cms-label', 'Text'))
            self.parts = []

    def handle_data(self, data):
        if self.current:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if self.current and tag == 'span':
            key, label = self.current
            value = ''.join(self.parts).strip()
            if value:
                self.fields[key] = {'key': key, 'label': label, 'value': value}
            self.current = None


class Command(BaseCommand):
    help = 'Connect rendered public page text to plain CMS fields without replacing templates.'

    def add_arguments(self, parser):
        parser.add_argument('--origin', default='http://localhost:3000')
        parser.add_argument('--path', help='Register fields for one public page only.')

    def handle(self, *args, **options):
        origin = options['origin'].rstrip('/')
        if not origin.startswith(('http://localhost:', 'http://127.0.0.1:')):
            raise CommandError('Use a local Next.js server.')
        pages = CMSPage.objects.filter(template_key='legacy', is_deleted=False)
        if options.get('path'):
            pages = pages.filter(path=options['path'])
        for page in pages:
            try:
                with urlopen(origin + page.path, timeout=60) as response:
                    html = response.read().decode('utf-8')
                parser = CopyParser()
                parser.feed(html)
            except Exception as error:
                self.stderr.write(f'{page.path}: {error}')
                continue
            if not parser.fields:
                self.stdout.write(f'{page.path}: no additional text fields')
                continue
            with transaction.atomic():
                # Add defaults to existing snapshots only. Never overwrite staff edits.
                for revision in page.revisions.filter(id__in=[page.published_revision_id, page.current_draft_revision_id]):
                    section = revision.sections.filter(slot='page_copy').first()
                    if not section:
                        section = CMSPageSection.objects.create(revision=revision, slot='page_copy', section_type='rich_text', position=0, data={'fields': []})
                    known = {field['key'] for field in section.data.get('fields', [])}
                    section.data['fields'] = section.data.get('fields', []) + [field for key, field in parser.fields.items() if key not in known]
                    section.save(update_fields=['data'])
                    snapshot = dict(revision.snapshot)
                    snapshot['sections'] = [s for s in snapshot.get('sections', []) if s.get('slot') != 'page_copy'] + [{'slot': 'page_copy', 'section_type': 'rich_text', 'position': 0, 'data': section.data, 'is_enabled': True}]
                    revision.snapshot = snapshot
                    revision.save(update_fields=['snapshot'])
            self.stdout.write(f'{page.path}: {len(parser.fields)} editable text fields')
