
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


# Meta WhatsApp body_text hard limits
_MAX_BODY_LEN = 1024
_MAX_BUTTONS = 3
_MAX_LABEL_LEN = 20



def build_action_buttons(
    config,
    room_uuid: str,
    *,
    next_room_uuid: str = "",
    include_details: bool = False,
    allow_exit: bool = True,
) -> list[dict]:
    """
    Build the list of interactive button dicts for a room card.

    Button ID scheme (unchanged):
      share_book:<uuid>
      share_details:<uuid>
      share_next:<current_uuid>:<next_uuid>
      share_exit:<uuid>
    """
    buttons: list[dict] = []

    if config.book_button_enabled:
        buttons.append({
            "id": f"share_book:{room_uuid}",
            "label": config.book_button_label[:_MAX_LABEL_LEN],
        })

    if include_details and config.details_button_enabled and len(buttons) < _MAX_BUTTONS:
        buttons.append({
            "id": f"share_details:{room_uuid}",
            "label": config.details_button_label[:_MAX_LABEL_LEN],
        })

    if next_room_uuid and config.next_button_enabled and len(buttons) < _MAX_BUTTONS:
        buttons.append({
            "id": f"share_next:{room_uuid}:{next_room_uuid}",
            "label": config.next_button_label[:_MAX_LABEL_LEN],
        })
    elif allow_exit and config.exit_button_enabled and len(buttons) < _MAX_BUTTONS:
        buttons.append({
            "id": f"share_exit:{room_uuid}",
            "label": config.exit_button_label[:_MAX_LABEL_LEN],
        })

    return buttons


def dispatch_card_or_text(conversation, body: str, options: list, room_uuid: str):
    """
    Send an interactive card if options are available, else plain text.
    Truncates body to Meta's 1024-char limit.
    """
    from apps.messaging.utils import send_and_save_interactive_buttons, send_and_save_message

    safe_body = body.strip()[:_MAX_BODY_LEN] or "Room details"
    if options:
        send_and_save_interactive_buttons(
            conversation,
            body_text=safe_body,
            options=options,
            related_room_uuid=room_uuid,
        )
    else:
        send_and_save_message(
            conversation,
            msg_type="text",
            body=safe_body,
            related_room_uuid=room_uuid,
        )
