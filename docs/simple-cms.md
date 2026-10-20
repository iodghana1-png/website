# Simple website CMS

This replaces the UI and permission requirements in the earlier Phase 3J specification. The latest user instruction is authoritative: every authenticated admin account (Django staff or superuser) can edit and publish all website content. Named business roles do not restrict CMS actions. Member accounts cannot access the CMS.

## Staff workflow

Open **Content → Pages**, search for a page, and choose **Edit**. The editor opens immediately with its current content. Existing page text, images and links use plain fields. Sections and search-engine settings are collapsed to keep the page manageable.

- **Save Changes** updates a published page immediately. A never-published page stays a draft until **Publish** is selected.
- **Save Draft** keeps changes private.
- **Membership application → After application: cohort availability** controls the upcoming/following cohort dates, availability and confirmation guidance shown only after a successful new membership application. Staff maintain these numbers; submitting an application does not reserve a place or reduce a count. Leave unconfirmed dates and availability as “to be confirmed”. Upgrade applicants receive separate review guidance. Bank and mobile-money payment details are not displayed on the application form.
- **Preview** saves a draft and opens a private preview. It never publishes.
- **Home** is one page, with the existing homepage sections available to edit, hide and reorder.
- Home’s **Partners** section uses the shared **Partners** page collection. Edit partner names, logos, website links and ordering there. Home controls the section heading and visibility; entries without logos remain hidden.
- **News** has its own list and editor. Existing news was copied into article records.
- **Media Library** supports search, upload, image selection, details, replacement and removal from the library. Removal archives the record; files referenced by existing content remain available.
- **Events → Event cards** controls the event listings on both Events and Home. Edit titles, descriptions, dates, venue/details, images and links there; removing the last card leaves the list empty.
- Home’s **News** and **Knowledge** sections control their headings and buttons. Their cards come from **News** articles and the relevant **Knowledge** document pages, not separate homepage copies.
- **Council → Council profiles** controls names, credentials, roles, biographies, photos and ordering. New and removed profiles appear in the preview and on the public page after publishing.
- **Secretariat → Secretariat profiles** controls staff names, credentials, roles, short introductions, full biographies, photos and ordering. The initial profiles are editable drafts seeded from IoD-Gh information already published publicly; review them and publish any updates from this panel.
- **Member spotlight** is available under **Content â†’ Pages**. Its **Member spotlight profiles** section is where staff add a featured member, their credentials, role, short story, full biography and optional portrait. Keep the newest profile first; it is displayed as the current feature and the remainder form the spotlight archive.
- **CPD & Seminars** displays entries from every enabled seminar and recording section in saved order.
- **Privacy** and **Terms** are editable under Pages, with the existing wording preserved. Their hero and policy-content sections can also be hidden.
- Each page’s **Search-engine settings** controls its own browser/search title and description, including subpages.
- **Navigation** edits names, page/external links, ordering, nesting and visibility on desktop and mobile. The existing header is registered automatically; unpublished drafts remain private. Removing items, including Home, does not restore a hardcoded copy. Use `/training/exams` for the environment-aware examination-portal link.
- **Settings** edits the organisation name, logo, favicon, contact details and social links.

## Developer integration

Django remains the source of published content. Existing page/article revisions, navigation, media and settings models are retained. Staff never edit storage objects, raw HTML, JSON, layout keys or revision numbers.

Predefined section forms and public section rendering live in `src/components/admin/cms/Sections.tsx` and `src/components/cms/ContentRenderer.tsx`. Rich text uses Tiptap's constrained formatting toolbar and is sanitised on both write and render.

Existing public layouts remain in source control. `EditableCopy`, `EditableImage` and `EditableLink` bind their existing content to page fields. Keys derive from developer-owned fallback values; staff see readable labels. When changing a fallback in source, register the new field and migrate a prior edited value if applicable.

Run normal migrations, start Next.js, then register the rendered fallback fields once:

```powershell
.venv/Scripts/python.exe backend/manage.py migrate
.venv/Scripts/python.exe backend/manage.py collect_page_copy
```

Registration is additive: it preserves previously saved field values and source records. It visits only a local server and populates existing published/draft snapshots with the content already displayed by the templates. It does not publish private drafts. Run it again after adding bindings to a template.

Homepage consolidation and news import are additive migrations. Original source records and revision history are retained. Old homepage-fragment admin links redirect to Home; old news-page admin links redirect to News.

Public layouts retrieve metadata through `cms-server.ts`. News detail routes resolve newly published articles, so new articles do not require source changes.

## Verification

```powershell
npm run lint
npm run build
.venv/Scripts/python.exe backend/manage.py test apps.content --settings=config.settings.test
```

Tests cover admin access regardless of named role, rejection of member accounts, draft/published isolation, signed private previews and safe rich text/links.

Run `node --test scripts/test-cms-rendering.mjs` to check that real public components render the CMS values for the member-register hero and news article fields. News preview uses the same article component as the public page, including author, category, date, cover image/caption and body. Author/category changes are snapshotted and remain private until publication.

The Members in Good Standing page's Hero fields control its main heading and introduction. Its editable page copy controls the previous-register text and PDF link. Member names and publication status remain in **Membership → Directory**, linked from the page editor. Register bindings for this page alone with `collect_page_copy --path /membership/members-in-good-standing`.
