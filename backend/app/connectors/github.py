"""GitHub Integration Connector"""

import asyncio
from datetime import timezone
import structlog
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from github import Github, GithubException, RateLimitExceededException

from app.connectors.base import BaseConnector, RawDocument
from app.api.middleware.error_handler import AuthenticationError

logger = structlog.get_logger(__name__)

class GitHubConnector(BaseConnector):
    def __init__(self, config: dict | None = None):
        super().__init__(config)

    def _get_client(self, credentials: dict | None = None) -> Github:
        creds = credentials or self.config
        token = creds.get("github_token")
        if not token:
            raise AuthenticationError("Missing GitHub token.")
        # Utilizing standard PyGithub integration paths gracefully wrapping timeouts internally
        return Github(token)

    async def authenticate(self, credentials: dict) -> bool:
        try:
            client = self._get_client(credentials)
            user = await asyncio.to_thread(client.get_user)
            await asyncio.to_thread(getattr, user, "login")
            return True
        except GithubException as e:
            logger.error("github_auth_error", error=str(e))
            raise AuthenticationError("Invalid GitHub credentials.")

    async def test_connection(self) -> bool:
        return await self.authenticate(self.config)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type(RateLimitExceededException)
    )
    async def fetch_documents(self, since: str | None = None) -> AsyncIterator[RawDocument]:
        client = self._get_client()
        tags = self.config.get("default_permission_tags", ["github"])
        
        since_dt = None
        if since:
            from dateutil import parser
            since_dt = parser.parse(since)
            if not since_dt.tzinfo:
                since_dt = since_dt.replace(tzinfo=timezone.utc)
        
        doc_count = 0
        try:
            user = await asyncio.to_thread(client.get_user)
            repos = await asyncio.to_thread(user.get_repos)
            
            def get_repos():
                return list(repos)
                
            repo_list = await asyncio.to_thread(get_repos)
            
            for repo in repo_list:
                repo_name = repo.full_name
                
                try:
                    def get_readme():
                        return repo.get_readme()
                    readme = await asyncio.to_thread(get_readme)
                    
                    iso_time = repo.updated_at.replace(tzinfo=timezone.utc).isoformat()
                    
                    if not since_dt or repo.updated_at.replace(tzinfo=timezone.utc) >= since_dt:
                        yield RawDocument(
                            source_id=f"gh-readme-{repo.id}",
                            source_type="github",
                            source_url=readme.html_url or f"https://github.com/{repo_name}/tree/main/README",
                            title=f"README: {repo_name}",
                            content=readme.decoded_content.decode("utf-8"),
                            author_email="noreply@github.com",
                            author_name=repo.owner.login if repo.owner else "System",
                            permission_tags=tags,
                            created_at=iso_time,
                            updated_at=iso_time,
                            metadata={"repo": repo_name, "type": "readme"}
                        )
                        doc_count += 1
                        if doc_count % 10 == 0: logger.info("github_ingestion_progress", docs=doc_count)
                except GithubException:
                    pass
                
                # Fetch dynamically pulling issues cleanly bypassing pagination issues via PyGithub bounds
                def get_issues():
                    kwargs = {"state": "all"}
                    if since_dt:
                        kwargs["since"] = since_dt
                    return list(repo.get_issues(**kwargs))
                    
                issues_list = await asyncio.to_thread(get_issues)
                for issue in issues_list:
                    if since_dt and issue.updated_at.replace(tzinfo=timezone.utc) < since_dt:
                        continue
                        
                    content = (issue.body or "")
                    author_name = issue.user.login if issue.user else "System"
                    doc_type = "pull_request" if issue.pull_request else "issue"
                    
                    iso_created = issue.created_at.replace(tzinfo=timezone.utc).isoformat()
                    iso_updated = issue.updated_at.replace(tzinfo=timezone.utc).isoformat()
                    
                    yield RawDocument(
                        source_id=f"gh-issue-{issue.id}",
                        source_type="github",
                        source_url=issue.html_url,
                        title=f"[{doc_type.upper()}] {repo_name} #{issue.number}: {issue.title}",
                        content=content,
                        author_email=f"{author_name}@users.noreply.github.com",
                        author_name=author_name,
                        permission_tags=tags,
                        created_at=iso_created,
                        updated_at=iso_updated,
                        metadata={"repo": repo_name, "type": doc_type}
                    )
                    doc_count += 1
                    if doc_count % 10 == 0: logger.info("github_ingestion_progress", docs=doc_count)
                    await asyncio.sleep(0.01)
                    
        except RateLimitExceededException as e:
            logger.warning("github_rate_limited", error=str(e))
            raise
        except GithubException as e:
            logger.error("github_fetch_error", error=str(e))
            raise
