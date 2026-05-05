import os
import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]


APPLICATION_HEADERS = [
    "application_id",
    "candidate_id",
    "candidate_name",
    "company_name",
    "job_title",
    "created_by",
    "status",
    "match_score",
    "duplicate_status",
    "original_job_url",
    "canonical_job_url",
    "submitted_at",
    "created_at",
    "manager_override_used",
    "manager_override_by",
    "manager_override_reason",
    "manager_override_at"
]


def get_google_sheet():
    sheet_id = os.getenv("GOOGLE_SHEET_ID")
    service_account_file = os.getenv(
        "GOOGLE_SERVICE_ACCOUNT_FILE",
        "google_service_account.json"
    )

    if not sheet_id:
        raise ValueError("GOOGLE_SHEET_ID is missing in .env")

    if not os.path.exists(service_account_file):
        raise FileNotFoundError(
            f"Google service account file not found: {service_account_file}"
        )

    credentials = Credentials.from_service_account_file(
        service_account_file,
        scopes=SCOPES
    )

    client = gspread.authorize(credentials)
    spreadsheet = client.open_by_key(sheet_id)

    return spreadsheet


def get_or_create_worksheet(spreadsheet, worksheet_name: str, headers: list[str]):
    try:
        worksheet = spreadsheet.worksheet(worksheet_name)
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(
            title=worksheet_name,
            rows=1000,
            cols=len(headers)
        )
        worksheet.append_row(headers)
        return worksheet

    existing_values = worksheet.get_all_values()

    if not existing_values:
        worksheet.append_row(headers)
        return worksheet

    current_headers = existing_values[0]

    if current_headers != headers:
        worksheet.update("A1", [headers])

    return worksheet


def get_existing_application_ids(worksheet) -> set[str]:
    """
    Reads application_id column from Google Sheet.
    Assumes application_id is column A.
    """
    all_values = worksheet.get_all_values()

    if len(all_values) <= 1:
        return set()

    existing_ids = set()

    for row in all_values[1:]:
        if not row:
            continue

        application_id = str(row[0]).strip()

        if application_id:
            existing_ids.add(application_id)

    return existing_ids


def application_to_row(app_item):
    candidate_name = "Unknown Candidate"

    if app_item.candidate:
        candidate_name = f"{app_item.candidate.first_name} {app_item.candidate.last_name}"

    return [
        app_item.id,
        app_item.candidate_id,
        candidate_name,
        app_item.company_name,
        app_item.job_title,
        app_item.created_by or "Unknown",
        app_item.status,
        app_item.match_score,
        app_item.duplicate_status,
        app_item.original_job_url,
        app_item.canonical_job_url,
        app_item.submitted_at.isoformat() if app_item.submitted_at else "",
        app_item.created_at.isoformat() if app_item.created_at else "",
        app_item.manager_override_used or "No",
        app_item.manager_override_by or "",
        app_item.manager_override_reason or "",
        app_item.manager_override_at.isoformat() if app_item.manager_override_at else ""
    ]


def sync_applications_to_sheet(applications: list):
    spreadsheet = get_google_sheet()

    worksheet = get_or_create_worksheet(
        spreadsheet,
        "Applications",
        APPLICATION_HEADERS
    )

    existing_application_ids = get_existing_application_ids(worksheet)

    rows_to_append = []
    skipped_existing_ids = []

    for app_item in applications:
        application_id = str(app_item.id)

        if application_id in existing_application_ids:
            skipped_existing_ids.append(application_id)
            continue

        rows_to_append.append(application_to_row(app_item))

    if rows_to_append:
        worksheet.append_rows(rows_to_append, value_input_option="USER_ENTERED")

    return {
        "worksheet": "Applications",
        "rows_synced": len(rows_to_append),
        "rows_skipped": len(skipped_existing_ids),
        "skipped_application_ids": skipped_existing_ids
    }