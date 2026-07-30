from django.conf import settings

def get_meta_template_url(waba_id=None, template_id=None):
    if template_id:
        return f"{settings.META_GRAPH_API_BASE_URL}/{template_id}"
    return f"{settings.META_GRAPH_API_BASE_URL}/{waba_id}/message_templates"
