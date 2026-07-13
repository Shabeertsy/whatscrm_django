from django.conf import settings
from storages.backends.s3 import S3Storage
import os

class R2MediaStorage(S3Storage):
    bucket_name = os.getenv("R2_BUCKET_NAME", "whatscrm-media")
    location = "whatsapp_media"
    default_acl = None
    file_overwrite = False
    querystring_auth = True

def get_whatsapp_storage():
    from django.core.files.storage import FileSystemStorage
    use_s3 = os.getenv("USE_S3_FOR_MEDIA", "False").lower() == "true"
    
    if use_s3:
        return R2MediaStorage()
        
    # Local fallback
    media_root = getattr(settings, 'MEDIA_ROOT', '')
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    return FileSystemStorage(
        location=os.path.join(media_root, 'whatsapp_media'),
        base_url=media_url + 'whatsapp_media/'
    )
