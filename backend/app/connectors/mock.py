"""Mock connector reading markdown fixtures with YAML front-matter."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from collections.abc import AsyncGenerator

import structlog
import yaml

from app.connectors.base import BaseConnector, RawDocument

logger = structlog.get_logger(__name__)


class MockConnector(BaseConnector):
    """Reads `fixture_dir` from credentials; each `*.md` becomes a RawDocument."""

    async def authenticate(self) -> None:
        fd = self.credentials.get("fixture_dir")
        if not isinstance(fd, str) or not Path(fd).is_dir():
            raise ValueError("mock connector requires credentials.fixture_dir pointing to a directory")

    async def health_check(self) -> bool:
        fd = self.credentials.get("fixture_dir")
        return isinstance(fd, str) and Path(fd).is_dir()

    async def fetch_documents(self) -> AsyncGenerator[RawDocument, None]:  # type: ignore[override]
        await self.authenticate()
        root = Path(str(self.credentials["fixture_dir"]))
        for path in sorted(root.glob("*.md")):
            raw_text = path.read_text(encoding="utf-8")
            if raw_text.startswith("---"):
                parts = raw_text.split("---", 2)
                if len(parts) >= 3:
                    meta = yaml.safe_load(parts[1]) or {}
                    body = parts[2].lstrip("\n")
                else:
                    meta, body = {}, raw_text
            else:
                meta, body = {}, raw_text

            ts_raw = meta.get("timestamp") if isinstance(meta, dict) else None
            if isinstance(ts_raw, str):
                ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
            elif isinstance(ts_raw, datetime):
                ts = ts_raw
            else:
                ts = datetime.now(timezone.utc)

            doc_type = str(meta.get("doc_type", "mock")) if isinstance(meta, dict) else "mock"
            title = str(meta.get("title", path.stem)) if isinstance(meta, dict) else path.stem
            author = str(meta.get("author", "unknown")) if isinstance(meta, dict) else "unknown"
            author_email = str(meta.get("author_email", "unknown@local")) if isinstance(meta, dict) else "unknown@local"
            perm = str(meta.get("permission_tag", "engineering")) if isinstance(meta, dict) else "engineering"
            source_url = str(meta.get("source_url", f"file://{path.as_posix()}")) if isinstance(meta, dict) else f"file://{path.as_posix()}"

            rid = str(meta.get("source_id", "")) if isinstance(meta, dict) else ""
            if not rid:
                rid = str(uuid.uuid5(uuid.NAMESPACE_URL, source_url))

            meta_dict: dict[str, object] = dict(meta) if isinstance(meta, dict) else {}
            meta_dict.setdefault("source_id", rid)

            yield RawDocument(
                source_url=source_url,
                doc_type=doc_type,
                title=title,
                content=body,
                author=author,
                author_email=author_email,
                timestamp=ts,
                metadata=meta_dict,
                permission_tag=perm,
                source_id=rid,
            )
