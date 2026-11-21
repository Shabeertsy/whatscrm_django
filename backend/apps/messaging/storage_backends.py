from django.conf import settings
from storages.backends.s3 import S3Storage
import os

class R2MediaStorage(S3Storage):
    bucket_name = os.getenv("R2_BUCKET_NAME", "whatscrm-media")
    location = "whatsapp_media"
    default_acl = None
    file_overwrite = False
    
    # If a custom public domain is configured for R2 (e.g. pub-xxx.r2.dev or media.domain.com),
    # URLs will be permanent clean public links without query strings.
    # Otherwise, signed URLs are generated with 7-day validity (and dynamically refreshed from storage_path).
    custom_domain = os.getenv("R2_PUBLIC_DOMAIN", os.getenv("AWS_S3_CUSTOM_DOMAIN", None))
    querystring_auth = False if custom_domain else True
    querystring_expire = 60 * 60 * 24 * 7  # 7 days

import functools

@functools.lru_cache(maxsize=1)
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
