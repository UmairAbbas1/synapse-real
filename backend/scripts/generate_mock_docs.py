"""One-shot generator for scripts/fixtures/mock_docs (50 markdown fixtures). Run: python scripts/generate_mock_docs.py"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "fixtures" / "mock_docs"
_BASE_TS = date(2025, 1, 15)

AUTHORS: list[tuple[str, str, str]] = [
    ("Alex Senior", "alex.senior@company.com", "Alex Senior"),
    ("Jamie Junior", "jamie.junior@company.com", "Jamie Junior"),
    ("Pat PM", "pat.pm@company.com", "Pat PM"),
    ("Robin HR", "robin.hr@company.com", "Robin HR"),
    ("Admin User", "admin@company.com", "Admin User"),
]
DOC_TYPES = ["github", "slack", "jira", "gdrive"]

SPEC: list[tuple[str, str, list[str]]] = [
    (
        "engineering",
        "engineering",
        [
            "Production Deployment Runbook",
            "CI/CD Pipeline Standards",
            "Engineering On-Call Playbook",
            "AWS Account Architecture",
            "Code Review Guidelines",
            "Incident Response Flow",
            "Kubernetes Cluster Operations",
            "Database Migration Checklist",
            "Security Patch Cadence",
            "Feature Flag Rollout Process",
            "Load Testing Expectations",
            "Staging Environment Usage",
            "Release Train Checklist",
            "Monitoring and Alerting Guide",
            "Blameless Postmortem Template",
        ],
    ),
    (
        "hr",
        "hr",
        [
            "Paid Time Off Policy",
            "New Hire Onboarding Checklist",
            "Performance Review Cycle",
            "Employee Benefits Overview",
            "Parental Leave Guidelines",
            "Workplace Code of Conduct",
            "Remote Work Policy",
            "Grievance and Escalation Process",
            "Compensation Review Framework",
            "Professional Development Stipend",
        ],
    ),
    (
        "pm",
        "pm",
        [
            "Q1 Product Roadmap Narrative",
            "Sprint Retrospective Format",
            "Stakeholder Status Update Template",
            "Program Risk Register",
            "OKR Definition Worksheet",
            "Backlog Refinement Playbook",
            "Customer-Facing Release Notes",
            "Customer Discovery Interview Guide",
            "Cross-Team Milestone Planning",
            "Dependency Mapping Workshop",
        ],
    ),
    (
        "public",
        "public",
        [
            "Company Values and Behaviors",
            "Office Locations and Hours",
            "IT Service Desk and Helpdesk",
            "Company Holiday Calendar",
            "Employee Directory Usage Policy",
            "Annual Security Awareness Training",
            "Expense Reimbursement Policy",
            "Business Travel Guidelines",
            "Diversity and Inclusion Statement",
            "Corporate Volunteering Program",
            "Building Access and Parking",
            "Visitor and Lobby Procedures",
            "Guest Wireless Access",
            "Corporate Software Requests",
            "Building Emergency Procedures",
        ],
    ),
]


def _body(title: str, folder: str) -> str:
    blocks: list[str] = []
    for i in range(12):
        blocks.append(
            f"""## Section {i + 1}: {title} — operational detail

The following guidance supports **{title}** for teams operating in the {folder} domain (segment {i + 1}). It reflects current enterprise practice and should be reviewed quarterly with security, legal, and operational stakeholders. Deployment procedures must include pre-flight checks, canary analysis, automated rollbacks, and explicit owners for each control plane change.

Operational teams should treat this document as the default reference when planning changes, communicating status, or auditing compliance. Where local runbooks exist, they must remain consistent with the principles outlined here and must cite this source when diverging. Capture meeting notes, architecture decision records, and risk assessments in the canonical wiki space.

For escalations, document the decision, owners, and timelines in the ticketing system referenced by your director. Retain artifacts such as architecture diagrams, test evidence, and sign-off threads for at least two years unless a longer retention period applies. When customer impact is possible, page the incident commander and follow the communications tree.

Finally, ensure that access to restricted sections follows least-privilege rules. Employees should complete required training before acting on privileged procedures, and contractors must work through a sponsor who holds an equivalent internal role. Secrets must never be pasted into chat; use the approved vault paths only.
"""
        )
    return "\n\n".join(blocks)


def main() -> None:
    idx = 0
    for folder, perm, titles in SPEC:
        sub = ROOT / folder
        sub.mkdir(parents=True, exist_ok=True)
        for t in titles:
            author_name, author_email, _ = AUTHORS[idx % len(AUTHORS)]
            doc_type = DOC_TYPES[idx % len(DOC_TYPES)]
            ts = (_BASE_TS + timedelta(days=idx)).isoformat()
            slug = t.lower().replace(" ", "-").replace("/", "-")[:48]
            path = sub / f"{idx + 1:02d}-{slug}.md"
            fm = f"""---
title: "{t}"
author: "{author_name}"
author_email: "{author_email}"
doc_type: "{doc_type}"
permission_tag: "{perm}"
timestamp: {ts}
---

"""
            path.write_text(fm + _body(t, folder), encoding="utf-8")
            idx += 1
    print(f"Wrote {idx} files under {ROOT}")


if __name__ == "__main__":
    main()
