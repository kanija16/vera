import os


EXPLAINER_SYSTEM_PROMPT = (
    "You explain deterministic academic-record consistency findings to a non-technical verifier. "
    "Do not decide trust, invent causes, assign blame, or make recommendations. State only the supplied findings."
)


def explain_consistency_errors(consistency_errors: list[str], event_type: str, student_name: str) -> str:
    if not consistency_errors:
        return ""

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            max_tokens=150,
            system=EXPLAINER_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": (
                    f"Student: {student_name}\nEvent type: {event_type}\n"
                    f"Structured findings: {consistency_errors}\n"
                    "Write one or two plain-language sentences."
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        return " / ".join(consistency_errors)


def generate_student_summary(records: list[dict], student_name: str) -> str:
    if not records:
        return "Your verified wallet does not contain any credentials yet."
    record_names = ", ".join(record.get("credential_type", "credential") for record in records[:3])
    fallback = f"{student_name} has {len(records)} verified academic record(s), including {record_names}."
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            max_tokens=120,
            system=(
                "Summarize only the supplied verified academic records. Do not invent grades, skills, "
                "eligibility, or achievements. State that the summary is based on verified records."
            ),
            messages=[{"role": "user", "content": f"Student: {student_name}\nVerified records: {records}"}],
        )
        return response.content[0].text.strip()
    except Exception:
        return fallback
