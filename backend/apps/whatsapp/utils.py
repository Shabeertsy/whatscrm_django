import requests
import os
from django.conf import settings
from rest_framework.exceptions import ValidationError

def get_meta_template_url(waba_id=None, template_id=None):
    if template_id:
        return f"{settings.META_GRAPH_API_BASE_URL}/{template_id}"
    return f"{settings.META_GRAPH_API_BASE_URL}/{waba_id}/message_templates"

def upload_media_to_meta_for_template(app_id: str, access_token: str, file_obj):
    """
    Uploads a file to Meta's Resumable Upload API to get a header_handle for template creation.
    """
    if not app_id:
        raise ValidationError("Meta App ID is required to upload media for templates.")

    file_size = file_obj.size
    file_type = file_obj.content_type or 'application/octet-stream'
    
    # Create Upload Session
    session_url = f"{settings.META_GRAPH_API_BASE_URL}/{app_id}/uploads"
    params = {
        "file_length": file_size,
        "file_type": file_type,
    }
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    res = requests.post(session_url, params=params, headers=headers)
    if res.status_code != 200:
        raise ValidationError(f"Failed to create upload session: {res.text}")
        
    session_id = res.json().get("id")
    if not session_id:
        raise ValidationError("Upload session ID not returned from Meta.")
        
    #  Upload File Data
    upload_url = f"{settings.META_GRAPH_API_BASE_URL}/{session_id}"
    upload_headers = {
        "Authorization": f"Bearer {access_token}",
        "file_offset": "0",
    }
    
    # Reset file pointer if needed
    file_obj.seek(0)
    upload_res = requests.post(upload_url, headers=upload_headers, data=file_obj.read())
    
    if upload_res.status_code != 200:
        raise ValidationError(f"Failed to upload file data: {upload_res.text}")
        
    header_handle = upload_res.json().get("h")
    if not header_handle:
        raise ValidationError("Header handle not returned from Meta.")
        
    return header_handle
