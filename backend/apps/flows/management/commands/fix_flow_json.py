"""
Management command: fix_flow_json

Fixes stored flow_json records to comply with the current Meta Flow JSON spec:
  1. Removes `input_type` on TextInput components (invalid property)
  2. Renames `on_click_action` → `on-click-action` (hyphen required)
  3. Adds missing `routing_model` for version >= 3.1
  4. Upgrades version from 3.0 → 6.0 (if still on 3.0)
  5. Wraps bare field components inside a Form if the layout has no Form wrapper
  6. Fixes navigate/complete action structure to use `name` instead of `type`

Usage:
    python manage.py fix_flow_json           # dry-run (show what would change)
    python manage.py fix_flow_json --apply   # apply fixes to the database
"""
import logging

from django.core.management.base import BaseCommand

from apps.flows.models import WhatsappFlow
from apps.flows.utils import clean_flow_json

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fix stored flow_json records to comply with the current Meta Flow JSON spec."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually save the changes. Without this flag, runs as a dry-run.",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(self.style.WARNING(f"[fix_flow_json] Mode: {mode}"))

        flows = WhatsappFlow.objects.all()
        total = flows.count()
        fixed = 0

        for flow in flows:
            if not flow.flow_json:
                continue
            cleaned_json, changed = clean_flow_json(flow.flow_json)
            if changed:
                fixed += 1
                label = "fixed" if apply else "needs fixing"
                self.stdout.write(
                    self.style.SUCCESS(f"  ✓ Flow '{flow.name}' (id={flow.id}) — {label}")
                )
                if apply:
                    flow.flow_json = cleaned_json
                    flow.save(update_fields=["flow_json", "updated_at"])
            else:
                self.stdout.write(f"  · Flow '{flow.name}' (id={flow.id}) — already valid")

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"[fix_flow_json] Done. {fixed}/{total} flows {'fixed' if apply else 'need fixing'}.")
        )
        if not apply and fixed > 0:
            self.stdout.write(self.style.WARNING("  Re-run with --apply to save the changes."))
