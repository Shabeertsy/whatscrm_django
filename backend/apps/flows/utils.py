import copy
import logging
import re

logger = logging.getLogger(__name__)



# Properties not allowed by Meta Flow JSON spec
DISALLOWED_PROPS: dict[str, set[str]] = {
    "TextInput": {"input_type"},
}

FIELD_TYPES = {"TextInput", "TextArea", "Dropdown", "RadioButtonsGroup", "CheckboxGroup", "DatePicker"}
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


def fix_dynamic_datasources(flow_json: dict, data_api_config: dict) -> tuple[dict, bool]:
    """
    Cross-reference data_api_config against the flow_json to fix two common issues:

    1. Old ``data-source`` format:
         ``${data.<field_id>}``  →  ``${data.<field_id>_options}``
       WhatsApp requires the server-returned key to match the binding exactly.
       The server always emits ``<field_id>_options``, so the binding must end
       in ``_options``.

    2. Missing ``data`` schema on the screen:
       WhatsApp ignores server-supplied keys that are not declared in the
       screen's ``data`` block.  We inject a minimal schema so the platform
       knows to accept and render the options.
    """
    if not data_api_config or not isinstance(flow_json, dict):
        return flow_json, False

    # Build a quick index: field_id → screen_id
    field_screen: dict[str, str] = {
        fid: cfg.get("screen", "") for fid, cfg in data_api_config.items()
    }
    dynamic_field_ids: set[str] = set(field_screen.keys())

    cleaned = copy.deepcopy(flow_json)
    changed = False

    for screen in cleaned.get("screens", []):
        screen_id = screen.get("id", "")

        # Collect dynamic field IDs that belong to this screen
        dynamic_on_screen = {fid for fid, sid in field_screen.items() if sid == screen_id}

        # Ensure the ``data`` schema block exists
        data_block = screen.get("data", {})
        if not isinstance(data_block, dict):
            data_block = {}

        for fid in dynamic_on_screen:
            options_key = f"{fid}_options"
            if options_key not in data_block:
                data_block[options_key] = {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id":    {"type": "string"},
                            "title": {"type": "string"},
                        },
                    },
                    "__example__": [
                        {"id": "opt1", "title": "Option 1"},
                        {"id": "opt2", "title": "Option 2"},
                    ],
                }
                screen["data"] = data_block
                changed = True
                logger.info(
                    "[fix_dynamic_datasources] Added data schema for '%s' on screen '%s'",
                    options_key, screen_id,
                )

        # Fix data-source bindings inside all form children
        layout = screen.get("layout", {})
        for top_child in layout.get("children", []):
            if not isinstance(top_child, dict):
                continue

            # Walk into Form → children
            children_to_check = (
                top_child.get("children", [])
                if top_child.get("type") == "Form"
                else [top_child]
            )

            for comp in children_to_check:
                if not isinstance(comp, dict):
                    continue
                if comp.get("type") not in ("Dropdown", "CheckboxGroup"):
                    continue

                ds = comp.get("data-source", "")
                if not isinstance(ds, str):
                    continue

                # Match: ${data.<field_id>}  where field_id is a dynamic field
                # but NOT already ending in _options
                m = re.fullmatch(r"\$\{data\.([a-zA-Z0-9_]+)\}", ds)
                if m:
                    fid = m.group(1)
                    if fid in dynamic_field_ids and not fid.endswith("_options"):
                        comp["data-source"] = f"${{data.{fid}_options}}"
                        changed = True
                        logger.info(
                            "[fix_dynamic_datasources] Fixed data-source for field '%s': "
                            "'%s' → '${data.%s_options}'",
                            fid, ds, fid,
                        )

    return cleaned, changed


def clean_flow_json(
    flow_json: dict,
    data_api_config: dict | None = None,
) -> tuple[dict, bool]:
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

    # Fix dynamic dropdown data-source bindings and inject missing data schema
    if data_api_config:
        cleaned, ds_changed = fix_dynamic_datasources(cleaned, data_api_config)
        if ds_changed:
            any_changed = True

        if cleaned.get("data_api_version") != "3.0":
            cleaned["data_api_version"] = "3.0"
            any_changed = True

    return cleaned, any_changed



def flatten_dict(d: dict, parent_key: str = '', sep: str = '.') -> dict:
    """
    Flattens a nested dictionary to dot-notation keys (e.g. location.city).
    Lists of dicts are joined by their inner properties (e.g. amenities.name -> 'Garden, Pool').
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else str(k)
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            if v and all(isinstance(x, dict) for x in v):
                flat_list = [flatten_dict(x) for x in v]
                subkeys = set()
                for flat_item in flat_list:
                    subkeys.update(flat_item.keys())
                for subk in subkeys:
                    vals = [str(fi[subk]) for fi in flat_list if subk in fi and fi[subk] is not None]
                    items.append((f"{new_key}{sep}{subk}", ", ".join(vals)))
            else:
                vals = [str(x) for x in v if x is not None]
                items.append((new_key, ", ".join(vals)))
        else:
            items.append((new_key, v))
    return dict(items)
