from django.db import migrations


def add_testimonial(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    page = Page.objects.select_for_update().filter(path="/", is_deleted=False).first()
    if not page:
        return

    for revision in Revision.objects.filter(pk__in=[page.published_revision_id, page.current_draft_revision_id]):
        main = Section.objects.filter(revision=revision, slot="main")
        if main.filter(section_type="quote", data__attribution="Adusei Kenneth, Software Engineer, Adusei Media").exists():
            continue
        sections = list(main.order_by("position"))
        position = next(
            (section.position for section in sections if section.data.get("home_section") == "partners"),
            sections[-1].position + 1 if sections else 0,
        )
        # Move the last section first to preserve the unique position constraint.
        for section in reversed(sections):
            if section.position >= position:
                section.position += 1
                section.save(update_fields=["position"])
        Section.objects.create(
            revision=revision, slot="main", position=position, section_type="quote",
            data={
                "heading": "Testimonials",
                "copy": "What I value about IoD-Gh is the chance to learn from other directors and hear how they approach decisions in the boardroom.",
                "attribution": "Adusei Kenneth, Software Engineer, Adusei Media",
            },
        )
        snapshot_sections = []
        for section in revision.sections.order_by("slot", "position"):
            snapshot_sections.append({
                "slot": section.slot, "section_type": section.section_type, "position": section.position,
                "data": section.data, "is_enabled": section.is_enabled,
                "primary_media": str(section.primary_media_id) if section.primary_media_id else None,
            })
        revision.snapshot = {**revision.snapshot, "sections": snapshot_sections}
        revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0032_add_events_calendar_page")]
    operations = [migrations.RunPython(add_testimonial, migrations.RunPython.noop)]
