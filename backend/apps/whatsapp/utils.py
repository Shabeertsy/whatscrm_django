def get_meta_template_url(waba_id=None, template_id=None):
    if template_id:
        return f"https://graph.facebook.com/v17.0/{template_id}"
    return f"https://graph.facebook.com/v17.0/{waba_id}/message_templates"
