"""Create the initial, editable public-site records for the CMS.

The command is deliberately non-destructive: it only creates records carrying
one of the stable ``seed_key`` values below. It is safe to run repeatedly and
does not overwrite an editor's changes.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.content.models import ContentItem, ContentPage


HOMEPAGE_ITEMS = (
    {
        "seed_key": "hero-better-boards",
        "section": ContentItem.Section.HERO,
        "title": "Better boards. Better governance.",
        "summary": "Developing directors and leaders for a stronger Ghana.",
        "href": "/events/national-corporate-governance-conference",
        "image_url": "/images/leadership-forum.png",
        "sort_order": 10,
        "metadata": {
            "eyebrow": "Institute of Directors Ghana",
            "primary_label": "Become a member",
            "primary_href": "/membership/apply",
            "secondary_label": "Explore training",
            "secondary_href": "/training",
            "feature": "National Corporate Governance Conference",
            "alt_text": "Ghanaian executives connecting at a leadership forum",
        },
    },
    {
        "seed_key": "hero-directors-ready",
        "section": ContentItem.Section.HERO,
        "title": "Directors ready to lead.",
        "summary": "Practical programmes for sharper judgement, stronger challenge and greater boardroom impact.",
        "href": "/training",
        "image_url": "/images/leadership-director.png",
        "sort_order": 20,
        "metadata": {
            "eyebrow": "Professional development",
            "primary_label": "Explore programmes",
            "primary_href": "/training",
            "secondary_label": "View CPD",
            "secondary_href": "/training/cpd",
            "feature": "Learning for the work that matters",
            "alt_text": "Ghanaian director reviewing board documents",
        },
    },
    {
        "seed_key": "hero-governance-trust",
        "section": ContentItem.Section.HERO,
        "title": "Governance that creates trust.",
        "summary": "Independent perspective and practical support for organisations that expect more from their boards.",
        "href": "/services/board-evaluation",
        "image_url": "/images/board-meeting.png",
        "sort_order": 30,
        "metadata": {
            "eyebrow": "Governance in practice",
            "primary_label": "Explore services",
            "primary_href": "/services",
            "secondary_label": "Our approach",
            "secondary_href": "/about",
            "feature": "Better boards start with better dialogue",
            "alt_text": "Ghanaian board members in a focused meeting",
        },
    },
    {
        "seed_key": "membership-student",
        "section": ContentItem.Section.MEMBERSHIP,
        "title": "Student",
        "summary": "For budding business leaders preparing for a future boardroom career or enterprise.",
        "href": "/membership/categories",
        "sort_order": 10,
        "metadata": {"display_meta": "For emerging leaders"},
    },
    {
        "seed_key": "membership-associate",
        "section": ContentItem.Section.MEMBERSHIP,
        "title": "Associate",
        "summary": "For ambitious professionals building the knowledge and perspective required for future board service.",
        "href": "/membership/categories",
        "sort_order": 20,
        "metadata": {"display_meta": "The starting point"},
    },
    {
        "seed_key": "membership-member",
        "section": ContentItem.Section.MEMBERSHIP,
        "title": "Member",
        "summary": "For established directors and senior executives committed to high standards of governance.",
        "href": "/membership/categories",
        "sort_order": 30,
        "metadata": {"display_meta": "Professional recognition"},
    },
    {
        "seed_key": "membership-fellow",
        "section": ContentItem.Section.MEMBERSHIP,
        "title": "Fellow",
        "summary": "For distinguished directors whose contribution and leadership demonstrate sustained excellence.",
        "href": "/membership/categories",
        "sort_order": 40,
        "metadata": {"display_meta": "The highest designation"},
    },
    {
        "seed_key": "membership-corporate",
        "section": ContentItem.Section.MEMBERSHIP,
        "title": "Corporate",
        "summary": "For organisations investing in stronger boards, leadership pipelines and governance culture.",
        "href": "/membership/corporate",
        "sort_order": 50,
        "metadata": {"display_meta": "For organisations"},
    },
    {
        "seed_key": "training-board-leadership",
        "section": ContentItem.Section.TRAINING,
        "title": "Board Leadership Programme",
        "summary": "A practical intensive for directors seeking sharper boardroom judgement and impact.",
        "href": "/training/board-leadership-programme",
        "sort_order": 10,
        "metadata": {"display_meta": "12–14 November 2026", "detail": "3 days · Accra · 18 CPD points"},
    },
    {
        "seed_key": "training-corporate-governance",
        "section": ContentItem.Section.TRAINING,
        "title": "Corporate Governance for Directors",
        "summary": "The essential governance programme for newly appointed and aspiring directors.",
        "href": "/training/corporate-governance-for-directors",
        "sort_order": 20,
        "metadata": {"display_meta": "3–4 December 2026", "detail": "2 days · Hybrid · 12 CPD points"},
    },
    {
        "seed_key": "training-effective-chair",
        "section": ContentItem.Section.TRAINING,
        "title": "The Effective Chair",
        "summary": "How to lead constructive debate, build trust and enable high-performing boards.",
        "href": "/training/effective-chair",
        "sort_order": 30,
        "metadata": {"display_meta": "21 January 2027", "detail": "1 day · Accra · 6 CPD points"},
    },
    {
        "seed_key": "knowledge-governance-outlook",
        "section": ContentItem.Section.KNOWLEDGE,
        "title": "Governance Outlook 2026",
        "summary": "The issues shaping board agendas in Ghana and across the region.",
        "href": "/knowledge/research",
        "sort_order": 10,
        "metadata": {"display_meta": "Research"},
    },
    {
        "seed_key": "knowledge-annual-report",
        "section": ContentItem.Section.KNOWLEDGE,
        "title": "Annual Report 2025",
        "summary": "A year of progress in professional directorship and institutional influence.",
        "href": "/knowledge/reports",
        "sort_order": 20,
        "metadata": {"display_meta": "Annual report"},
    },
    {
        "seed_key": "knowledge-board-evaluation",
        "section": ContentItem.Section.KNOWLEDGE,
        "title": "A Director’s Guide to Board Evaluation",
        "summary": "A practical framework for improving board performance.",
        "href": "/knowledge/resources",
        "sort_order": 30,
        "metadata": {"display_meta": "Resource"},
    },
    {
        "seed_key": "news-governance-leadership-forum",
        "section": ContentItem.Section.NEWS,
        "title": "IoD-Gh convenes leaders on the future of corporate governance",
        "summary": "Directors and senior decision-makers gathered in Accra for a timely conversation on responsible leadership.",
        "href": "/news/governance-leadership-forum",
        "image_url": "/images/leadership-forum.png",
        "sort_order": 10,
        "metadata": {"display_meta": "Institute news · 24 September 2026", "alt_text": "Leadership forum participants"},
    },
    {
        "seed_key": "news-board-composition",
        "section": ContentItem.Section.NEWS,
        "title": "Why board composition matters more than ever",
        "summary": "A perspective on the skills, independence and diversity that make boards effective.",
        "href": "/news/why-board-composition-matters",
        "sort_order": 20,
        "metadata": {"display_meta": "Insight · 11 September 2026"},
    },
    {
        "seed_key": "news-board-leadership-cohort",
        "section": ContentItem.Section.NEWS,
        "title": "New cohort begins the Board Leadership Programme",
        "summary": "Directors from across sectors begin a focused journey in leadership and governance.",
        "href": "/news/board-leadership-cohort",
        "sort_order": 30,
        "metadata": {"display_meta": "Professional development · 28 August 2026"},
    },
    {
        "seed_key": "events-governance-conference",
        "section": ContentItem.Section.EVENTS,
        "title": "National Corporate Governance Conference",
        "summary": "A national conversation on leadership, resilience and long-term value creation.",
        "href": "/events/national-corporate-governance-conference",
        "sort_order": 10,
        "metadata": {"display_meta": "18 October 2026", "detail": "Kempinski Hotel Gold Coast City, Accra"},
    },
    {
        "seed_key": "events-leadership-ethics-forum",
        "section": ContentItem.Section.EVENTS,
        "title": "Leadership & Ethics Forum",
        "summary": "A considered discussion on values-led leadership in a changing operating environment.",
        "href": "/events/leadership-and-ethics-forum",
        "sort_order": 20,
        "metadata": {"display_meta": "4 November 2026", "detail": "IoD-Gh Centre, Accra · Hybrid"},
    },
    {
        "seed_key": "events-networking-evening",
        "section": ContentItem.Section.EVENTS,
        "title": "Directors' Networking Evening",
        "summary": "An evening of peer exchange with Ghana's director community.",
        "href": "/events/directors-networking-evening",
        "sort_order": 30,
        "metadata": {"display_meta": "20 November 2026", "detail": "Kumasi · In person"},
    },
    {
        "seed_key": "services-governance-consultancy",
        "section": ContentItem.Section.SERVICES,
        "title": "Governance consultancy",
        "summary": "Independent advice that helps organisations build confidence in their governance foundations.",
        "href": "/services/consultancy",
        "sort_order": 10,
        "metadata": {"display_meta": "Advisory"},
    },
    {
        "seed_key": "services-board-evaluation",
        "section": ContentItem.Section.SERVICES,
        "title": "Board evaluation",
        "summary": "Rigorous, sensitive and evidence-led evaluation for better board performance.",
        "href": "/services/board-evaluation",
        "sort_order": 20,
        "metadata": {"display_meta": "Board effectiveness"},
    },
    {
        "seed_key": "services-corporate-meeting",
        "section": ContentItem.Section.SERVICES,
        "title": "Corporate meeting",
        "summary": "Well-supported meeting arrangements for focused board and leadership discussions.",
        "href": "/services/corporate-meeting",
        "sort_order": 30,
        "metadata": {"display_meta": "Meeting support"},
    },
)


HOMEPAGE_PAGES = (
    {
        "slug": "home-introduction",
        "label": "Homepage introduction",
        "eyebrow": "Who we are",
        "title": "A professional home for directors.",
        "summary": "Championing director professionalism and development through good corporate governance.",
        "body": (
            "Institute of Directors Ghana is a professional organization committed to the professional practice of Corporate Directorship.\n\n"
            "Our purpose is to champion director professionalism and development through good corporate governance for the benefit of organizations, stakeholders and the prosperity of Ghana.\n\n"
            "We recognize and unlock member potential through world-class learning opportunities, knowledge sharing, networking, mentorship and the promotion of world-class standards in Corporate Governance."
        ),
        "blocks": [{"type": "cta", "label": "Discover IoD-Gh", "href": "/about"}],
    },
    {
        "slug": "home-membership",
        "label": "Homepage membership heading",
        "eyebrow": "Membership",
        "title": "Find your place at IoD-Gh.",
        "summary": "A professional home for directors and organisations at every stage of their governance journey.",
        "body": "",
        "blocks": [{"type": "cta", "label": "Explore membership", "href": "/membership"}],
    },
    {
        "slug": "home-training",
        "label": "Homepage training heading",
        "eyebrow": "Upcoming events",
        "title": "Develop your directorship.",
        "summary": "Practical programmes that bring sharper insight and greater confidence to the work of the board.",
        "body": "",
        "blocks": [{"type": "cta", "label": "Explore all events", "href": "/events"}],
    },
    {
        "slug": "home-knowledge",
        "label": "Homepage knowledge heading",
        "eyebrow": "Knowledge centre",
        "title": "Insight for the boardroom.",
        "summary": "A considered collection of research, reports and practical resources for better governance.",
        "body": "",
        "blocks": [],
    },
    {
        "slug": "home-news",
        "label": "Homepage news heading",
        "eyebrow": "News & perspectives",
        "title": "The governance conversation.",
        "summary": "",
        "body": "",
        "blocks": [{"type": "cta", "label": "View all news", "href": "/news"}],
    },
    {
        "slug": "home-partners",
        "label": "Homepage partners heading",
        "eyebrow": "Strategic partners",
        "title": "Partnerships that extend our impact.",
        "summary": "We collaborate with institutions that share our commitment to stronger governance and capable leadership.",
        "body": "",
        "blocks": [{"type": "cta", "label": "Explore partnerships", "href": "/about/partners"}],
    },
    {
        "slug": "membership-page",
        "label": "Membership page hero",
        "eyebrow": "Membership",
        "title": "Find your place in Ghana's director community.",
        "summary": "Membership is a commitment to professional growth, better governance and the confidence to lead with purpose.",
        "body": "",
        "blocks": [{"type": "cta", "label": "Begin your application", "href": "/membership/apply"}],
    },
    {
        "slug": "training-page",
        "label": "Training page hero",
        "eyebrow": "Upcoming events",
        "title": "Develop your directorship.",
        "summary": "Practical programmes for directors who want to lead boards with greater confidence, judgement and impact.",
        "body": "",
        "blocks": [],
    },
    {
        "slug": "knowledge-page",
        "label": "Knowledge page hero",
        "eyebrow": "Knowledge centre",
        "title": "Insight for better boardroom decisions.",
        "summary": "Research, publications and practical resources for directors navigating an evolving governance landscape.",
        "body": "",
        "blocks": [],
    },
    {
        "slug": "news-page",
        "label": "News page hero",
        "eyebrow": "IoD-Gh news",
        "title": "The conversation on governance.",
        "summary": "News, perspectives and practical insight from the Institute and Ghana's director community.",
        "body": "",
        "blocks": [],
    },
    {
        "slug": "events-page",
        "label": "Events page hero",
        "eyebrow": "IoD-Gh events",
        "title": "Where Ghana's director community meets.",
        "summary": "Events that bring directors together for practical learning, considered debate and meaningful connection.",
        "body": "",
        "blocks": [],
    },
    {
        "slug": "services-page",
        "label": "Services page hero",
        "eyebrow": "IoD-Gh services",
        "title": "Governance support that moves organisations forward.",
        "summary": "For boards and leadership teams seeking clearer direction, stronger oversight and more confident decisions.",
        "body": "",
        "blocks": [{"type": "cta", "label": "Talk to IoD-Gh", "href": "/contact"}],
    },
)


MENU_PAGE_HEROES = (
    {"slug": "about-page", "label": "About page hero", "eyebrow": "About IoD-Gh", "title": "Professional directorship. Stronger Ghana.", "summary": "IoD-Gh is Ghana's professional institute for directors, championing better boards, better leadership and better governance."},
    {"slug": "about-history", "label": "About history page hero", "eyebrow": "Our Story", "title": "Built on a belief in responsible leadership.", "summary": "IoD-Gh has championed the professional practice of directorship, evolving alongside Ghana's economy and institutions."},
    {"slug": "about-vision-mission", "label": "Vision and mission page hero", "eyebrow": "Vision & Mission", "title": "Our vision and mission.", "summary": "The direction and purpose that guide the Institute's work."},
    {"slug": "about-council", "label": "Council page hero", "eyebrow": "Council", "title": "Stewardship for the Institute and the profession.", "summary": "Our Council provides strategic direction and upholds the standards that guide IoD-Gh."},
    {"slug": "about-secretariat", "label": "Secretariat page hero", "eyebrow": "Secretariat", "title": "The team behind the Institute.", "summary": "Our Secretariat translates purpose into practical programmes, member experience and national influence."},
    {"slug": "about-partners", "label": "Strategic partners page hero", "eyebrow": "Strategic partners", "title": "Partnerships that extend our impact.", "summary": "We collaborate with institutions that share our commitment to stronger governance and capable leadership."},
    {"slug": "membership-categories", "label": "Membership categories page hero", "eyebrow": "Membership", "title": "A community shaped by contribution.", "summary": "Discover the membership category aligned to your experience, ambition and organisational role."},
    {"slug": "membership-benefits", "label": "Membership benefits page hero", "eyebrow": "Membership benefits", "title": "More confidence in every boardroom.", "summary": "Professional recognition, purposeful learning and meaningful peer connection - all in one membership."},
    {"slug": "membership-fees", "label": "Membership fees page hero", "eyebrow": "Membership fees", "title": "A clear investment in your directorship.", "summary": "Explore indicative annual membership fees and programme options for individuals and organisations."},
    {"slug": "membership-corporate", "label": "Corporate membership page hero", "eyebrow": "Corporate membership", "title": "Stronger governance begins inside the organisation.", "summary": "Equip your leadership community with the insight, development and connection to lead responsibly."},
    {"slug": "membership-verify", "label": "Membership verification page hero", "eyebrow": "Member verification", "title": "Verify an IoD-Gh member.", "summary": "Enter all or part of a member's name to check whether they are listed in the IoD-Gh register of members in good standing."},
    {"slug": "membership-members-in-good-standing", "label": "Good standing register page hero", "eyebrow": "Membership register", "title": "Members in good standing.", "summary": "A public register for recognising IoD-Gh members whose membership standing is current."},
    {"slug": "training-professional", "label": "Professional training page hero", "eyebrow": "Professional development", "title": "Professional training in Corporate Governance.", "summary": "A rigorous course for directors and leaders who want to strengthen governance practice and professional directorship."},
    {"slug": "training-cpd", "label": "CPD page hero", "eyebrow": "Professional development", "title": "CPD and Seminars.", "summary": "Focused learning to support your continuing professional development as a director."},
    {"slug": "training-exams", "label": "Exams portal page hero", "eyebrow": "Professional development", "title": "Exams Portal.", "summary": "Examination information, guidance and important notices for IoD-Gh candidates."},
    {"slug": "training-customized", "label": "Customised programmes page hero", "eyebrow": "Professional development", "title": "Learning built around your organisation.", "summary": "Bespoke governance and leadership programmes designed for your context."},
    {"slug": "training-board-leadership-programme", "label": "Board leadership programme hero", "eyebrow": "Director programme", "title": "Board Leadership Programme", "summary": "A practical intensive for directors seeking sharper boardroom judgement and impact."},
    {"slug": "training-corporate-governance-for-directors", "label": "Corporate governance programme hero", "eyebrow": "Director programme", "title": "Corporate Governance for Directors", "summary": "The essential governance programme for newly appointed and aspiring directors."},
    {"slug": "training-effective-chair", "label": "Effective chair programme hero", "eyebrow": "Director programme", "title": "The Effective Chair", "summary": "How to lead constructive debate, build trust and enable high-performing boards."},
    {"slug": "knowledge-publications", "label": "Publications page hero", "eyebrow": "IoD-Gh publications", "title": "Publications for thoughtful directors.", "summary": "Practical perspectives on governance, leadership and board effectiveness."},
    {"slug": "knowledge-reports", "label": "Reports page hero", "eyebrow": "Knowledge centre", "title": "Reports that track our progress.", "summary": "Read the Institute's annual reports and key publications."},
    {"slug": "knowledge-research", "label": "Research page hero", "eyebrow": "Knowledge centre", "title": "Research for a changing world.", "summary": "Evidence-led insight into the questions shaping governance today."},
    {"slug": "knowledge-resources", "label": "Resources page hero", "eyebrow": "Knowledge centre", "title": "Resources for your boardroom.", "summary": "Useful frameworks, guides and reading for directors."},
    {"slug": "events-national-corporate-governance-conference", "label": "Governance conference page hero", "eyebrow": "IoD-Gh event", "title": "National Corporate Governance Conference", "summary": "A national conversation on leadership, resilience and long-term value creation."},
    {"slug": "events-leadership-and-ethics-forum", "label": "Leadership and ethics forum page hero", "eyebrow": "IoD-Gh event", "title": "Leadership & Ethics Forum", "summary": "A considered discussion on values-led leadership in a changing operating environment."},
    {"slug": "events-directors-networking-evening", "label": "Directors networking evening page hero", "eyebrow": "IoD-Gh event", "title": "Directors' Networking Evening", "summary": "An evening of peer exchange with Ghana's director community."},
    {"slug": "news-governance-leadership-forum", "label": "Governance leadership forum article hero", "eyebrow": "Institute news · 24 September 2026", "title": "IoD-Gh convenes leaders on the future of corporate governance", "summary": "Directors and senior decision-makers gathered in Accra for a timely conversation on responsible leadership."},
    {"slug": "news-why-board-composition-matters", "label": "Board composition article hero", "eyebrow": "Insight · 11 September 2026", "title": "Why board composition matters more than ever", "summary": "A perspective on the skills, independence and diversity that make boards effective."},
    {"slug": "news-board-leadership-cohort", "label": "Board leadership cohort article hero", "eyebrow": "Professional development · 28 August 2026", "title": "New cohort begins the Board Leadership Programme", "summary": "Directors from across sectors begin a focused journey in leadership and governance."},
    {"slug": "media-event-gallery", "label": "Event gallery page hero", "eyebrow": "IoD-Gh media", "title": "Event gallery.", "summary": "A visual record of IoD-Gh gatherings, conversations and professional development moments."},
    {"slug": "services-consultancy", "label": "Governance consultancy page hero", "eyebrow": "IoD-Gh services", "title": "Governance consultancy", "summary": "Independent advice that helps organisations build confidence in their governance foundations."},
    {"slug": "services-board-evaluation", "label": "Board evaluation page hero", "eyebrow": "IoD-Gh services", "title": "Board evaluation", "summary": "Rigorous, sensitive and evidence-led evaluation for better board performance."},
    {"slug": "services-corporate-meeting", "label": "Corporate meeting page hero", "eyebrow": "IoD-Gh services", "title": "Corporate meeting", "summary": "Well-supported meeting arrangements for focused board and leadership discussions."},
    {"slug": "contact-page", "label": "Contact page hero", "eyebrow": "Contact IoD-Gh", "title": "Let's start a conversation.", "summary": "Whether you are exploring membership, professional development or governance support, our team is ready to help."},
)


class Command(BaseCommand):
    help = "Create the initial editable, published public-site content records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--draft",
            action="store_true",
            help="Create initial items as drafts instead of publishing them.",
        )

    def handle(self, *args, **options):
        status = ContentItem.Status.DRAFT if options["draft"] else ContentItem.Status.PUBLISHED
        created_items = 0
        for source in HOMEPAGE_ITEMS:
            seed_key = source["seed_key"]
            values = {key: value for key, value in source.items() if key != "seed_key"}
            metadata = {**values.pop("metadata"), "seed_key": seed_key}
            item, was_created = ContentItem.objects.get_or_create(
                section=source["section"],
                metadata__seed_key=seed_key,
                defaults={
                    **values,
                    "metadata": metadata,
                    "status": status,
                    "published_at": timezone.now() if status == ContentItem.Status.PUBLISHED else None,
                },
            )
            if was_created:
                created_items += 1
                self.stdout.write(f"Created {item.section}: {item.title}")

        created_pages = 0
        for source in (*HOMEPAGE_PAGES, *MENU_PAGE_HEROES):
            page, was_created = ContentPage.objects.get_or_create(
                slug=source["slug"],
                defaults={
                    "body": "",
                    "blocks": [],
                    **source,
                    "status": status,
                    "published_at": timezone.now() if status == ContentItem.Status.PUBLISHED else None,
                },
            )
            if was_created:
                created_pages += 1
                self.stdout.write(f"Created page: {page.label}")

        self.stdout.write(self.style.SUCCESS(
            "Public-site CMS seed complete: "
            f"{created_items} items and {created_pages} page headings created."
        ))
