import os
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.core.files.storage import Storage
from django.conf import settings


class CloudinaryMediaStorage(Storage):
    def __init__(self):
        cfg = getattr(settings, 'CLOUDINARY_STORAGE', {})
        cloudinary.config(
            cloud_name=cfg.get('CLOUD_NAME', ''),
            api_key=cfg.get('API_KEY', ''),
            api_secret=cfg.get('API_SECRET', ''),
            secure=True,
        )

    def _open(self, name, mode='rb'):
        raise NotImplementedError

    def _save(self, name, content):
        folder = os.path.dirname(name)
        if hasattr(content, 'seek'):
            content.seek(0)
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            resource_type='auto',
        )
        return result['secure_url']

    def url(self, name):
        if not name:
            return ''
        if name.startswith('http'):
            return name
        url, _ = cloudinary.utils.cloudinary_url(name, secure=True)
        return url

    def exists(self, name):
        return False

    def delete(self, name):
        try:
            public_id = name.rsplit('.', 1)[0] if '.' in name else name
            cloudinary.uploader.destroy(public_id)
        except Exception:
            pass

    def size(self, name):
        return 0
