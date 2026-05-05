def has_access(user_tags: list[str], doc_tags: list[str]) -> bool:
    if "*" in user_tags or "admin" in [t.lower() for t in user_tags]:
        return True
    return bool(set(user_tags) & set(doc_tags))


class TestRBACFilter:
    def test_junior_dev_cannot_access_hr_docs(self) -> None:
        user_tags = ["engineering", "backend"]
        doc_tags = ["hr", "payroll"]
        assert not has_access(user_tags, doc_tags)

    def test_admin_accesses_everything(self) -> None:
        user_tags = ["admin", "*"]
        doc_tags = ["hr", "payroll"]
        assert has_access(user_tags, doc_tags)

    def test_matching_tag_grants_access(self) -> None:
        user_tags = ["engineering", "backend", "devops"]
        doc_tags = ["engineering"]
        assert has_access(user_tags, doc_tags)
