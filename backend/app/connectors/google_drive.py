"""Google Drive Integration Connector"""

import asyncio
from datetime import datetime, timezone
import structlog
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import GoogleAuthError

from app.connectors.base import BaseConnector, RawDocument
from app.api.middleware.error_handler import AuthenticationError

logger = structlog.get_logger(__name__)

class GoogleDriveConnector(BaseConnector):
    def __init__(self, config: dict | None = None):
        super().__init__(config)

    def _build_service(self, credentials: dict | None = None):
        creds_data = credentials or self.config
        token = creds_data.get("google_token")
        refresh_token = creds_data.get("google_refresh_token")
        client_id = creds_data.get("google_client_id")
        client_secret = creds_data.get("google_client_secret")
        
        if not token:
            raise AuthenticationError("Missing Google credentials.")
            
        creds = Credentials(
            token=token,
            refresh_token=refresh_token,
            tok_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
        # Suppress discovery cache to avoid file-system write assumptions locally
        return build('drive', 'v3', credentials=creds, cache_discovery=False)

    async def authenticate(self, credentials: dict) -> bool:
        try:
            service = self._build_service(credentials)
            def test_call():
                return service.about().get(fields="user").execute()
            user_info = await asyncio.to_thread(test_call)
            return "user" in user_info
        except (HttpError, GoogleAuthError) as e:
            logger.error("gdrive_auth_error", error=str(e))
            raise AuthenticationError("Invalid Google Drive credentials.")

    async def test_connection(self) -> bool:
        return await self.authenticate(self.config)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type(HttpError)
    )
    async def fetch_documents(self, since: str | None = None) -> AsyncIterator[RawDocument]:
        service = self._build_service()
        tags = self.config.get("default_permission_tags", ["google_drive"])
        doc_count = 0
        
        query = "mimeType='application/vnd.google-apps.document' and trashed=false"
        if since:
            from dateutil import parser
            dt = parser.parse(since)
            iso_time = dt.isoformat()
            query += f" and modifiedTime > '{iso_time}'"
            
        page_token = None
        
        try:
            while True:
                def list_files():
                    return service.files().list(
                        q=query,
                        spaces='drive',
                        fields='nextPageToken, files(id, name, createdTime, modifiedTime, owners, webViewLink)',
                        pageToken=page_token,
                        pageSize=100
                    ).execute()
                    
                results = await asyncio.to_thread(list_files)
                files = results.get('files', [])
                
                for file in files:
                    file_id = file['id']
                    
                    def export_doc():
                        return service.files().export(fileId=file_id, mimeType='text/plain').execute()
                        
                    try:
                        content_bytes = await asyncio.to_thread(export_doc)
                        if not content_bytes:
                            continue
                        content = content_bytes.decode('utf-8')
                        
                        owners = file.get("owners", [])
                        author_name = owners[0].get("displayName", "System") if owners else "System"
                        author_email = owners[0].get("emailAddress", "unknown@system") if owners else "unknown@system"
                        
                        created_at = file.get("createdTime", datetime.now(timezone.utc).isoformat())
                        updated_at = file.get("modifiedTime", datetime.now(timezone.utc).isoformat())
                        
                        yield RawDocument(
                            source_id=f"gdrive-{file_id}",
                            source_type="google_drive",
                            source_url=file.get("webViewLink", ""),
                            title=file.get("name", "Untitled Document"),
                            content=content,
                            author_email=author_email,
                            author_name=author_name,
                            permission_tags=tags,
                            created_at=created_at,
                            updated_at=updated_at,
                            metadata={"drive": "general"}
                        )
                        doc_count += 1
                        if doc_count % 10 == 0: logger.info("gdrive_ingestion_progress", docs=doc_count)
                        await asyncio.sleep(0.01)
                            
                    except HttpError as e:
                        if e.resp.status == 429:
                            raise e
                        logger.warning("gdrive_export_failed", file_id=file_id, error=str(e))
                        
                page_token = results.get('nextPageToken')
                if not page_token:
                    break
        except HttpError as e:
            if hasattr(e, "resp") and getattr(e.resp, "status", 0) in [429, 500, 503]:
                logger.warning("gdrive_rate_limited", error=str(e))
                raise
            logger.error("gdrive_fetch_error", error=str(e))
            raise
