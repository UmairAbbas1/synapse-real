"""Slack Integration Connector"""

import structlog
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from slack_sdk.web.async_client import AsyncWebClient
from slack_sdk.errors import SlackApiError

from app.connectors.base import BaseConnector, RawDocument
from app.api.middleware.error_handler import AuthenticationError

logger = structlog.get_logger(__name__)

class SlackConnector(BaseConnector):
    def __init__(self, config: dict | None = None):
        super().__init__(config)

    def _get_client(self, token: str) -> AsyncWebClient:
        return AsyncWebClient(token=token)

    async def authenticate(self, credentials: dict) -> bool:
        token = credentials.get("bot_token")
        if not token:
            raise AuthenticationError("Missing bot token.")
        try:
            client = self._get_client(token)
            resp = await client.auth_test()
            return resp.get("ok", False)
        except SlackApiError as e:
            logger.error("slack_auth_error", error=str(e))
            raise AuthenticationError("Invalid Slack credentials or permissions.")

    async def test_connection(self) -> bool:
        return await self.authenticate(self.config)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(SlackApiError)
    )
    async def fetch_documents(self, since: str | None = None) -> AsyncIterator[RawDocument]:
        token = self.config.get("bot_token")
        if not token:
            raise AuthenticationError("No token configured. Aborting fetch.")
        
        client = self._get_client(token)
        
        oldest_ts = None
        if since:
            from dateutil import parser
            dt = parser.parse(since)
            oldest_ts = str(dt.timestamp())
            
        tags = self.config.get("default_permission_tags", ["slack"])
        doc_count = 0
        user_cache = {}
        
        try:
            channels_resp = await client.conversations_list(types="public_channel,private_channel")
            for channel in channels_resp.get("channels", []):
                channel_id = channel["id"]
                channel_name = channel["name"]
                
                has_more = True
                cursor = None
                
                while has_more:
                    history = await client.conversations_history(
                        channel=channel_id,
                        cursor=cursor,
                        oldest=oldest_ts,
                        limit=200
                    )
                    
                    for msg in history.get("messages", []):
                        if msg.get("type") != "message" or "subtype" in msg:
                            continue
                            
                        user_id = msg.get("user")
                        if not user_id:
                            continue
                            
                        if user_id not in user_cache:
                            user_info = await client.users_info(user=user_id)
                            profile = user_info.get("user", {}).get("profile", {})
                            user_cache[user_id] = {
                                "email": profile.get("email", "unknown@slack.local"),
                                "name": profile.get("real_name", "Unknown User")
                            }
                            
                        uinfo = user_cache[user_id]
                        ts = msg.get("ts", "")
                        
                        from datetime import datetime, timezone
                        iso_date = datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
                        
                        yield RawDocument(
                            source_id=f"slack-{channel_id}-{ts}",
                            source_type="slack",
                            source_url=f"slack://channel/{channel_id}/message/{ts}",
                            title=f"Slack Message in #{channel_name}",
                            content=msg.get("text", ""),
                            author_email=uinfo["email"],
                            author_name=uinfo["name"],
                            permission_tags=tags,
                            created_at=iso_date,
                            updated_at=iso_date,
                            metadata={"channel": channel_name}
                        )
                        doc_count += 1
                        if doc_count % 10 == 0:
                            logger.info("slack_ingestion_progress", docs_processed=doc_count)
                            
                    has_more = history.get("has_more", False)
                    cursor = history.get("response_metadata", {}).get("next_cursor")
        except SlackApiError as e:
            if hasattr(e, "response") and e.response.status_code == 429:
                logger.warning("slack_rate_limited", error=str(e))
                raise
            logger.error("slack_fetch_error", error=str(e))
            raise
