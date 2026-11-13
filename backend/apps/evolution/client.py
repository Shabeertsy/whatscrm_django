import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class EvolutionAPIError(Exception):
    """Raised when an Evolution API request fails."""
    def __init__(self, message, status_code=None, response_data=None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class EvolutionClient:
    """
    Dedicated HTTP Client for Self-Hosted Evolution API (Baileys / Scanned Physical Devices).
    """

    def __init__(self, base_url: str = None, api_key: str = None):
        self.base_url = (base_url or getattr(settings, 'EVOLUTION_API_URL', 'http://localhost:8080')).rstrip('/')
        self.api_key = api_key if api_key is not None else getattr(settings, 'EVOLUTION_API_KEY', '')

    def _headers(self) -> dict:
        headers = {
            'Content-Type': 'application/json',
        }
        if self.api_key:
            headers['apikey'] = self.api_key
        return headers

    def _clean_number(self, phone: str) -> str:
        cleaned = ''.join(c for c in str(phone) if c.isdigit())
        return cleaned

    def _request(self, method: str, endpoint: str, json_data: dict = None, params: dict = None, timeout: int = 15) -> dict:
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._headers(),
                json=json_data,
                params=params,
                timeout=timeout,
            )
            logger.debug(f"[EvolutionClient] {method} {url} -> {response.status_code}")
            
            # Evolution API may return non-JSON on fatal server error
            try:
                data = response.json()
            except Exception:
                data = {"raw_text": response.text}

            if not response.ok:
                error_msg = f"Evolution API returned error {response.status_code}: {data}"
                logger.error(f"[EvolutionClient] {error_msg}")
                raise EvolutionAPIError(error_msg, status_code=response.status_code, response_data=data)

            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EvolutionClient] Network/connection error calling {url}: {e}")
            raise EvolutionAPIError(f"Could not connect to Evolution API at {url}: {e}")


    # ── Instance Management ─────────────────────

    def create_instance(self, instance_name: str, qrcode: bool = True) -> dict:
        """
        Creates a new WhatsApp instance on Evolution API.
        """
        payload = {
            "instanceName": instance_name,
            "token": instance_name,
            "qrcode": qrcode,
            "integration": "WHATSAPP-BAILEYS",
            "rejectCall": False,
            "msgCall": "",
            "groupsIgnore": True,
            "alwaysOnline": False,
            "readMessages": False,
            "readStatus": False,
            "syncFullHistory": False,
        }
        return self._request('POST', '/instance/create', json_data=payload)

    def set_settings(self, instance_name: str, settings_dict: dict = None) -> dict:
        """
        Updates instance behavior settings (alwaysOnline, readMessages, etc).
        """
        payload = {
            "rejectCall": False,
            "msgCall": "",
            "groupsIgnore": True,
            "alwaysOnline": False,
            "readMessages": False,
            "readStatus": False,
            "syncFullHistory": False,
        }
        if settings_dict:
            payload.update(settings_dict)
        return self._request('POST', f"/settings/set/{instance_name}", json_data=payload)


    def connect_instance(self, instance_name: str) -> dict:
        """
        Retrieves QR code (base64 string) or initiates connection for linking device.
        """
        return self._request('GET', f"/instance/connect/{instance_name}")

    def get_connection_state(self, instance_name: str) -> dict:
        """
        Checks connection state: 'open', 'close', 'connecting'.
        """
        return self._request('GET', f"/instance/connectionState/{instance_name}")

    def set_webhook(self, instance_name: str, webhook_url: str, events: list = None) -> dict:
        """
        Subscribes to Evolution API events for this instance.
        """
        subscribed_events = events or [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
        ]
        payload = {
            "webhook": {
                "enabled": True,
                "url": webhook_url,
                "byEvents": False,
                "base64": True,
                "events": subscribed_events,
            }
        }
        return self._request('POST', f"/webhook/set/{instance_name}", json_data=payload)

    def logout_instance(self, instance_name: str) -> dict:
        """
        Logs out active session from the physical phone.
        """
        return self._request('DELETE', f"/instance/logout/{instance_name}")

    def delete_instance(self, instance_name: str) -> dict:
        """
        Completely deletes the instance from Evolution API container.
        """
        return self._request('DELETE', f"/instance/delete/{instance_name}")

    def find_chats(self, instance_name: str) -> list:
        """
        Retrieves all existing chats from Evolution API.
        """
        res = self._request('POST', f"/chat/findChats/{instance_name}", json_data={})
        return res if isinstance(res, list) else []

    def find_contacts(self, instance_name: str) -> list:
        """
        Retrieves all contacts saved in Evolution API for this instance.
        """
        res = self._request('POST', f"/chat/findContacts/{instance_name}", json_data={})
        return res if isinstance(res, list) else []

    def find_messages(self, instance_name: str, where: dict = None, page: int = 1, limit: int = 100) -> list:
        """
        Retrieves messages stored in Evolution API for this instance.
        """
        payload = {}
        if where:
            payload["where"] = where
        res = self._request('POST', f"/chat/findMessages/{instance_name}", json_data=payload)
        if isinstance(res, dict) and "messages" in res:
            return res["messages"].get("records", [])
        return res if isinstance(res, list) else []


    # ── Outbound Message Dispatch 
    def send_text_message(
        self,
        instance_name: str,
        to_phone: str,
        text: str,
        delay: int = 1200,
        quoted_id: str = "",
    ) -> dict:
        """
        Sends standard 1-on-1 text message via physical phone session.
        Emulates typing presence for 1-2 seconds to reduce automated detection.
        """
        number = self._clean_number(to_phone)
        payload = {
            "number": number,
            "text": text,
            "delay": delay,
            "presence": "composing",
            "linkPreview": True,
        }
        if quoted_id:
            payload["quoted"] = {
                "key": {
                    "id": quoted_id
                }
            }
        return self._request('POST', f"/message/sendText/{instance_name}", json_data=payload)

    def send_media_message(
        self,
        instance_name: str,
        to_phone: str,
        media_url: str,
        media_type: str = "image",
        caption: str = "",
        filename: str = "",
        delay: int = 1200,
    ) -> dict:
        """
        Sends media (image, audio, video, document) via physical phone session.
        """
        number = self._clean_number(to_phone)
        payload = {
            "number": number,
            "mediatype": media_type,
            "caption": caption or "",
            "media": media_url,
            "fileName": filename or "media",
            "delay": delay,
        }
        return self._request('POST', f"/message/sendMedia/{instance_name}", json_data=payload)
