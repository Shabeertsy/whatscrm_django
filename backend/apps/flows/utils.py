import copy
import logging

logger = logging.getLogger(__name__)

# Properties not allowed by Meta Flow JSON spec, keyed by component type.
DISALLOWED_PROPS: dict[str, set[str]] = {
    "TextInput": {"input_type"},
}

FIELD_TYPES = {"TextInput", "TextArea", "Dropdown", "RadioButtonsGroup", "CheckboxGroup"}
TARGET_VERSION = "6.0"


def fix_action(action: dict) -> tuple[dict, bool]:
    """Normalize a click action dict to the correct spec structure."""
    if not isinstance(action, dict):
        return action, False

    changed = False
    action = dict(action)

    # `type: "complete"` → `name: "complete"`
    if action.get("type") == "complete" and "name" not in action:
        action["name"] = "complete"
        del action["type"]
        changed = True

    # `type: "navigate"` + `next: {name: ...}` → `name: "navigate", next_screen: ...`
    if action.get("type") == "navigate" and "next" in action:
        next_obj = action.pop("next", {})
        screen_name = next_obj.get("name", "")
        action["name"] = "navigate"
        action["next_screen"] = screen_name
        action.pop("type", None)
        action.pop("payload", None)
        changed = True

    # data_exchange: ensure payload has `screen` not `next_screen`
    if action.get("name") == "data_exchange":
        payload = action.get("payload", {})
        if "next_screen" in payload and "screen" not in payload:
            payload["screen"] = payload.pop("next_screen")
            action["payload"] = payload
            changed = True

    return action, changed


def fix_component(component: dict) -> tuple[dict, bool]:
    """Recursively fix a single component dict."""
    changed = False
    comp = dict(component)

    #  Strip disallowed props
    component_type = comp.get("type", "")
    for key in DISALLOWED_PROPS.get(component_type, set()):
        if key in comp:
            del comp[key]
            changed = True

    #  Fix on_click_action → on-click-action
    if "on_click_action" in comp:
        comp["on-click-action"] = comp.pop("on_click_action")
        changed = True

    #  Fix the action value itself
    if "on-click-action" in comp:
        fixed_action, action_changed = fix_action(comp["on-click-action"])
        comp["on-click-action"] = fixed_action
        if action_changed:
            changed = True

    #  Recurse into children
    if "children" in comp and isinstance(comp["children"], list):
        new_children = []
        for child in comp["children"]:
            if isinstance(child, dict):
                fixed_child, child_changed = fix_component(child)
                new_children.append(fixed_child)
                if child_changed:
                    changed = True
            else:
                new_children.append(child)
        comp["children"] = new_children

    return comp, changed


def fix_screen_layout(screen: dict) -> tuple[dict, bool]:
    """
    Ensure the screen layout has:
    - Form wrapper around field components
    - Footer as a sibling of Form (not inside it)
    """
    changed = False
    layout = screen.get("layout", {})
    children = layout.get("children", [])

    # Check if there's already a Form component at the top level
    has_form = any(c.get("type") == "Form" for c in children if isinstance(c, dict))

    if not has_form and children:
        # Separate field components from Footer
        fields = [c for c in children if isinstance(c, dict) and c.get("type") in FIELD_TYPES]
        footer = [c for c in children if isinstance(c, dict) and c.get("type") == "Footer"]
        other  = [c for c in children if isinstance(c, dict) and c.get("type") not in FIELD_TYPES and c.get("type") != "Footer"]

        if fields:
            form_wrapper = {"type": "Form", "name": "form", "children": fields}
            layout["children"] = other + [form_wrapper] + footer
            screen["layout"] = layout
            changed = True

    return screen, changed


def build_routing_model(screens: list[dict]) -> dict:
    routing: dict[str, list] = {}
    for i, screen in enumerate(screens):
        sid = screen.get("id", "")
        routing[sid] = [screens[i + 1]["id"]] if i < len(screens) - 1 else []
    return routing


def clean_flow_json(flow_json: dict) -> tuple[dict, bool]:
    """Apply all fixes to a flow_json dict. Returns (fixed_json, was_changed)."""
    if not isinstance(flow_json, dict):
        return flow_json, False

    cleaned = copy.deepcopy(flow_json)
    any_changed = False

    #  Upgrade version
    if cleaned.get("version") != TARGET_VERSION:
        cleaned["version"] = TARGET_VERSION
        any_changed = True

    screens = cleaned.get("screens", [])

    #  Add routing_model if missing
    if "routing_model" not in cleaned:
        cleaned["routing_model"] = build_routing_model(screens)
        any_changed = True

    #  Fix each screen
    fixed_screens = []
    for screen in screens:
        screen, layout_changed = fix_screen_layout(screen)
        if layout_changed:
            any_changed = True

        layout = screen.get("layout", {})
        new_children = []
        for child in layout.get("children", []):
            if isinstance(child, dict):
                fixed_child, child_changed = fix_component(child)
                new_children.append(fixed_child)
                if child_changed:
                    any_changed = True
            else:
                new_children.append(child)
        layout["children"] = new_children
        screen["layout"] = layout
        fixed_screens.append(screen)

    cleaned["screens"] = fixed_screens
    return cleaned, any_changed
