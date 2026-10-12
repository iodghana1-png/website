"""Make the current public menu editable without publishing private drafts."""

import json
from pathlib import Path

from django.db import migrations
from django.db.models import Max
from django.utils import timezone


def connect_navigation(apps, schema_editor):
    Menu = apps.get_model("content", "CMSNavigationMenu")
    Revision = apps.get_model("content", "CMSNavigationRevision")
    Item = apps.get_model("content", "CMSNavigationItem")
    menu, _ = Menu.objects.get_or_create(key="header-primary", defaults={"label": "Header"})
    if menu.published_revision_id:
        return
    defaults = json.loads((Path(__file__).parent / "data" / "header_navigation.json").read_text(encoding="utf-8"))
    snapshot = []
    for entry in defaults:
        parent_index = len(snapshot)
        snapshot.append({"label": entry["label"], "href": entry["href"], "parent_index": None})
        for child in entry.get("children", []):
            snapshot.append({"label": child["label"], "href": child["href"], "parent_index": parent_index})
    for position, item in enumerate(snapshot):
        item.update(position=position, link_type="internal", page=None, open_in_new_tab=False, is_enabled=True)
    revision = Revision.objects.create(
        menu=menu,
        number=(menu.revisions.aggregate(last=Max("number"))["last"] or 0) + 1,
        state="published",
        published_at=timezone.now(),
        change_summary="Connect the existing public header to the CMS",
        snapshot=snapshot,
    )
    created = []
    for data in snapshot:
        parent_index = data["parent_index"]
        fields = {key: value for key, value in data.items() if key not in ("parent_index", "page")}
        created.append(Item.objects.create(
            revision=revision,
            parent=created[parent_index] if parent_index is not None else None,
            **fields,
        ))
    # The previously saved draft, if any, stays private and remains editable.
    menu.published_revision = revision
    menu.save(update_fields=["published_revision", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("content", "0026_connect_legal_pages")]
    operations = [migrations.RunPython(connect_navigation, migrations.RunPython.noop)]
