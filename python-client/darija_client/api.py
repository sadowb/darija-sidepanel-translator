import base64
import json
import urllib.error
import urllib.request

from .config import ApiConfig


class TranslationClientError(RuntimeError):
    pass


class TranslationApiClient:
    def __init__(self, config: ApiConfig):
        config.validate()
        self._config = config

    def translate(self, text: str) -> str:
        credentials = base64.b64encode(
            f"{self._config.username}:{self._config.password}".encode()
        ).decode()
        request = urllib.request.Request(
            f"{self._config.base_url}/api/v1/translations",
            data=json.dumps({"text": text}).encode(),
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request, timeout=self._config.timeout_seconds
            ) as response:
                return json.load(response)["translation"]
        except urllib.error.HTTPError as error:
            try:
                payload = json.load(error)
                message = payload.get("message") or payload.get("error")
            except (ValueError, AttributeError):
                message = None
            raise TranslationClientError(message or "Translation failed.") from error
        except urllib.error.URLError as error:
            raise TranslationClientError(
                "Could not reach the translation server."
            ) from error
