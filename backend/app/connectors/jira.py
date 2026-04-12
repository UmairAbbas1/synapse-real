"""Jira Integration Connector"""

import asyncio
from datetime import datetime, timezone
import structlog
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from atlassian import Jira
from requests.exceptions import RequestException

from app.connectors.base import BaseConnector, RawDocument
from app.api.middleware.error_handler import AuthenticationError

logger = structlog.get_logger(__name__)

class JiraConnector(BaseConnector):
    def __init__(self, config: dict | None = None):
        super().__init__(config)

    def _get_client(self, credentials: dict | None = None) -> Jira:
        creds = credentials or self.config
        url = creds.get("jira_url")
        username = creds.get("jira_email")
        token = creds.get("jira_token")
        
        if not url or not username or not token:
            raise AuthenticationError("Missing Jira credentials.")
            
        return Jira(url=url, username=username, password=token)

    async def authenticate(self, credentials: dict) -> bool:
        try:
            client = self._get_client(credentials)
            res = await asyncio.to_thread(client.myself)
            return bool(res and "accountId" in res)
        except Exception as e:
            logger.error("jira_auth_error", error=str(e))
            raise AuthenticationError("Invalid Jira credentials.")

    async def test_connection(self) -> bool:
        return await self.authenticate(self.config)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(RequestException)
    )
    async def fetch_documents(self, since: str | None = None) -> AsyncIterator[RawDocument]:
        client = self._get_client()
        tags = self.config.get("default_permission_tags", ["jira"])
        doc_count = 0
        
        jql = ""
        if since:
            from dateutil import parser
            dt = parser.parse(since)
            jql = f"updated >= '{dt.strftime('%Y-%m-%d %H:%M')}'"
            
        start_at = 0
        max_results = 50
        
        try:
            while True:
                def get_issues():
                    return client.jql(jql, start=start_at, limit=max_results)
                    
                result = await asyncio.to_thread(get_issues)
                issues = result.get("issues", [])
                
                if not issues:
                    break
                    
                for issue in issues:
                    fields = issue.get("fields", {})
                    key = issue.get("key")
                    url = f"{client.url}/browse/{key}"
                    title = fields.get("summary", "")
                    desc = fields.get("description", "") or ""
                    
                    def get_comments():
                        return client.issue_get_comments(key)
                        
                    comments_resp = await asyncio.to_thread(get_comments)
                    comments_texts = [c.get("body", "") for c in comments_resp.get("comments", [])]
                    
                    full_content = desc + "\n\n" + "\n\n".join(comments_texts)
                    
                    creator = fields.get("creator") or {}
                    author_name = creator.get("displayName", "System")
                    author_email = creator.get("emailAddress", f"{author_name.replace(' ', '')}@jira.local")
                    
                    created = fields.get("created", datetime.now(timezone.utc).isoformat())
                    updated = fields.get("updated", datetime.now(timezone.utc).isoformat())
                    
                    yield RawDocument(
                        source_id=f"jira-{key}",
                        source_type="jira",
                        source_url=url,
                        title=f"{key}: {title}",
                        content=full_content,
                        author_email=author_email,
                        author_name=author_name,
                        permission_tags=tags,
                        created_at=created,
                        updated_at=updated,
                        metadata={"project": fields.get("project", {}).get("name", "")}
                    )
                    doc_count += 1
                    if doc_count % 10 == 0: logger.info("jira_ingestion_progress", docs=doc_count)
                    await asyncio.sleep(0.01)
                    
                start_at += len(issues)
                if start_at >= result.get("total", 0):
                    break
        except RequestException as e:
            if hasattr(e, "response") and e.response is not None and e.response.status_code == 429:
                logger.warning("jira_rate_limited", error=str(e))
                raise
            logger.error("jira_fetch_error", error=str(e))
            raise
