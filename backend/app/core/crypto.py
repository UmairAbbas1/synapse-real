"""Crypto helpers for encrypting credentials at rest."""

from __future__ import annotations

import hashlib
from base64 import urlsafe_b64encode

from cryptography.fernet import Fernet

from app.config import settings


def get_fernet() -> Fernet:
    """Return Fernet cipher; derives key from SECRET_KEY when FERNET_KEY unset."""
    if settings.FERNET_KEY:
        return Fernet(settings.FERNET_KEY.encode())
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(urlsafe_b64encode(digest))


def encrypt_json_credentials(raw: dict[str, object]) -> str:
    """Serialize dict to JSON and Fernet-encrypt to ASCII token."""
    import json

    payload = json.dumps(raw, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return get_fernet().encrypt(payload).decode("ascii")


def decrypt_json_credentials(token: str) -> dict[str, object]:
    """Decrypt Fernet token to dict."""
    import json

    raw = get_fernet().decrypt(token.encode("ascii"))
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("credentials payload must be a JSON object")
    return data


def decrypt_credentials_from_config(config: dict[str, object]) -> dict[str, object]:
    """Decrypt credentials_enc field from data_sources.config."""
    enc = config.get("credentials_enc")
    if not isinstance(enc, str):
        return {}
    return decrypt_json_credentials(enc)
