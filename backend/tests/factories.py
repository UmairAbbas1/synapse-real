from __future__ import annotations

from datetime import UTC, datetime

import factory


class UserFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.Sequence(lambda n: f"user_{n}")
    email = factory.Faker("email")
    display_name = factory.Faker("name")
    role_id = factory.Sequence(lambda n: f"role-{n}")


class DataSourceFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.Sequence(lambda n: f"source_{n}")
    source_type = factory.Iterator(["slack", "github", "jira", "google_drive"])
    config = factory.LazyFunction(dict)
    status = factory.Iterator(["active", "paused", "error"])


class AuditLogFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.Sequence(lambda n: f"log_{n}")
    user_id = factory.Sequence(lambda n: f"user_{n}")
    action = factory.Iterator(["query", "login", "role_change", "source_connect"])
    resource_type = factory.Iterator(["query", "user", "data_source"])
    details = factory.LazyFunction(dict)
    query_hash = factory.Sequence(lambda n: f"{n:064x}"[-64:])
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
