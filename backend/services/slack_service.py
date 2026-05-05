import os
import requests
from dotenv import load_dotenv

load_dotenv()


def format_daily_report_for_slack(report_data: dict) -> str:
    report_date = report_data.get("report_date", "")
    summary = report_data.get("summary", {})
    by_bidder = report_data.get("by_bidder", {})
    by_candidate = report_data.get("by_candidate", {})

    total_created = summary.get("total_created", 0)
    total_submitted = summary.get("total_submitted", 0)
    total_low_match = summary.get("total_low_match", 0)
    total_duplicates = summary.get("total_duplicates", 0)
    status_counts = summary.get("status_counts_created_today", {})

    bidder_lines = []
    if by_bidder:
        sorted_bidders = sorted(
            by_bidder.items(),
            key=lambda item: item[1],
            reverse=True
        )

        for bidder, count in sorted_bidders[:10]:
            bidder_lines.append(f"• {bidder}: {count}")
    else:
        bidder_lines.append("• No bidder data")

    candidate_lines = []
    if by_candidate:
        sorted_candidates = sorted(
            by_candidate.items(),
            key=lambda item: item[1],
            reverse=True
        )

        for candidate, count in sorted_candidates[:10]:
            candidate_lines.append(f"• {candidate}: {count}")
    else:
        candidate_lines.append("• No candidate data")

    status_lines = []
    if status_counts:
        for status, count in status_counts.items():
            status_lines.append(f"• {status}: {count}")
    else:
        status_lines.append("• No status data")

    message = f"""
*Daily Application Report*
*Date:* {report_date}

*Summary*
• Total Created: {total_created}
• Total Submitted: {total_submitted}
• Low Match: {total_low_match}
• Duplicates: {total_duplicates}

*Status Breakdown*
{chr(10).join(status_lines)}

*Bidder Performance*
{chr(10).join(bidder_lines)}

*Candidate Breakdown*
{chr(10).join(candidate_lines)}
""".strip()

    if total_low_match > 0 or total_duplicates > 0:
        message += f"""

*Quality Alerts*
• Low Match Applications: {total_low_match}
• Duplicate Applications: {total_duplicates}
"""

    return message


def send_slack_message(message: str):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")

    if not webhook_url:
        raise ValueError("SLACK_WEBHOOK_URL is missing in .env")

    response = requests.post(
        webhook_url,
        json={"text": message},
        timeout=15
    )

    if response.status_code >= 400:
        raise Exception(
            f"Slack webhook failed: {response.status_code} - {response.text}"
        )

    return {
        "status": "sent",
        "status_code": response.status_code
    }