from app.services.explainer import explain_consistency_errors


def test_explainer_returns_empty_for_no_findings():
    assert explain_consistency_errors([], "MIGRATION_REQ", "Alice Smith") == ""


def test_explainer_degrades_to_structured_findings_when_ai_unavailable():
    findings = ["TIMELINE_INCONSISTENCY: migration predates enrollment", "MISSING_FIELD: credits"]
    assert explain_consistency_errors(findings, "MIGRATION_REQ", "Alice Smith") == " / ".join(findings)
