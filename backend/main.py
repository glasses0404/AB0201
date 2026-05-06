import os
import csv
import json
from io import StringIO
from fastapi.responses import StreamingResponse

from datetime import datetime, date, time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Candidate, Application, GoogleSheetsSyncLog, SlackReportLog, CandidateAnswer
from schemas import (
    CandidateCreate,
    CandidateResponse,
    ApplicationCreate,
    ApplicationResponse,
    JobExtractRequest,
    JobExtractResponse,
    ApplicationStatusUpdate,
    ApplicationStatusOverrideUpdate,
    GoogleSheetsSyncLogResponse,
    SlackReportLogResponse,
    JobPageDetectRequest,
    JobPageDetectResponse,
    ScreeningField,
    ScreeningAutofillRequest,
    ScreeningAutofillAnswer,
    ScreeningAutofillResponse,
    CandidateAnswerCreate,
    CandidateAnswerUpdate,
    CandidateAnswerResponse,
    MatchAnalyzeRequest,
    MatchAnalyzeResponse
)

from services.url_service import preserve_original_url, create_canonical_url
from services.duplicate_service import check_duplicate
from services.match_service import calculate_match_score
from services.cover_letter_service import generate_cover_letter
from services.screening_service import generate_screening_answers
from services.job_extract_service import extract_job_info_with_ai
from services.job_page_detection_service import detect_job_page_with_ai
from services.structured_match_service import analyze_structured_match
from services.google_sheets_service import (
    sync_applications_to_sheet,
    sync_dashboard_to_sheet
)
from services.slack_service import (
    format_daily_report_for_slack,
    send_slack_message
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Autobidder MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Autobidder MVP API is running"
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Autobidder MVP API",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/candidates", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    new_candidate = Candidate(**candidate.dict())
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    return new_candidate

@app.post("/candidates/{candidate_id}/answers", response_model=CandidateAnswerResponse)
def create_candidate_answer(
    candidate_id: int,
    answer_req: CandidateAnswerCreate,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    new_answer = CandidateAnswer(
        candidate_id=candidate_id,
        question_key=answer_req.question_key,
        question_label=answer_req.question_label,
        answer=answer_req.answer,
        answer_type=answer_req.answer_type or "short"
    )

    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)

    return new_answer


@app.get("/candidates/{candidate_id}/answers", response_model=list[CandidateAnswerResponse])
def list_candidate_answers(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    answers = db.query(CandidateAnswer).filter(
        CandidateAnswer.candidate_id == candidate_id
    ).order_by(CandidateAnswer.created_at.desc()).all()

    return answers


@app.patch("/candidate-answers/{answer_id}", response_model=CandidateAnswerResponse)
def update_candidate_answer(
    answer_id: int,
    answer_req: CandidateAnswerUpdate,
    db: Session = Depends(get_db)
):
    saved_answer = db.query(CandidateAnswer).filter(
        CandidateAnswer.id == answer_id
    ).first()

    if not saved_answer:
        raise HTTPException(status_code=404, detail="Candidate answer not found")

    if answer_req.question_key is not None:
        saved_answer.question_key = answer_req.question_key

    if answer_req.question_label is not None:
        saved_answer.question_label = answer_req.question_label

    if answer_req.answer is not None:
        saved_answer.answer = answer_req.answer

    if answer_req.answer_type is not None:
        saved_answer.answer_type = answer_req.answer_type

    saved_answer.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(saved_answer)

    return saved_answer


@app.delete("/candidate-answers/{answer_id}")
def delete_candidate_answer(
    answer_id: int,
    db: Session = Depends(get_db)
):
    saved_answer = db.query(CandidateAnswer).filter(
        CandidateAnswer.id == answer_id
    ).first()

    if not saved_answer:
        raise HTTPException(status_code=404, detail="Candidate answer not found")

    db.delete(saved_answer)
    db.commit()

    return {
        "message": "Candidate answer deleted",
        "answer_id": answer_id
    }

@app.get("/candidates", response_model=list[CandidateResponse])
def list_candidates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).order_by(Candidate.created_at.desc()).all()
    return candidates

@app.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return candidate

@app.post("/extract-job-info", response_model=JobExtractResponse)
def extract_job_info(req: JobExtractRequest):
    result = extract_job_info_with_ai(
        url=req.url,
        page_title=req.page_title,
        page_text=req.page_text
    )

    return {
        "company_name": result.get("company_name"),
        "job_title": result.get("job_title"),
        "confidence": result.get("confidence", "Low"),
        "reason": result.get("reason")
    }

@app.post("/applications", response_model=ApplicationResponse)
def create_application(app_req: ApplicationCreate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == app_req.candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    original_url = preserve_original_url(app_req.original_job_url)
    canonical_url = create_canonical_url(app_req.original_job_url)

    duplicate_status = check_duplicate(
        db=db,
        candidate_id=app_req.candidate_id,
        company_name=app_req.company_name,
        job_title=app_req.job_title,
        canonical_job_url=canonical_url
    )

    candidate_name = f"{candidate.first_name} {candidate.last_name}"

    match_analysis = analyze_structured_match(
        candidate_name=candidate_name,
        resume_text=candidate.resume_text or "",
        company_name=app_req.company_name,
        job_title=app_req.job_title,
        job_description=app_req.job_description
    )

    match_score = float(match_analysis.get("overall_score", 0))
    match_analysis_json = json.dumps(match_analysis)

    cover_letter = generate_cover_letter(
        candidate_name=candidate_name,
        resume_text=candidate.resume_text or "",
        company_name=app_req.company_name,
        job_title=app_req.job_title,
        job_description=app_req.job_description
    )

    candidate_profile = {
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "location": candidate.location,
        "linkedin": candidate.linkedin,
        "github": candidate.github,
        "portfolio": candidate.portfolio,
        "work_authorization": candidate.work_authorization,
        "sponsorship_required": candidate.sponsorship_required,
        "expected_salary": candidate.expected_salary,
    }

    screening_answers = generate_screening_answers(
        resume_text=candidate.resume_text or "",
        candidate_profile=candidate_profile,
        questions=app_req.screening_questions or []
    )

    recommendation = match_analysis.get("recommendation", "Needs Review")

    if duplicate_status == "Exact Duplicate":
        initial_status = "Duplicate"
    elif recommendation == "Skip":
        initial_status = "Skipped - Low Match"
    elif recommendation == "Needs Review":
        initial_status = "Needs Review"
    else:
        initial_status = "Draft Generated"

    new_application = Application(
        candidate_id=app_req.candidate_id,
        company_name=app_req.company_name,
        job_title=app_req.job_title,
        original_job_url=original_url,
        canonical_job_url=canonical_url,
        application_url=original_url,
        job_description=app_req.job_description,
        match_score=match_score,
        match_analysis_json=match_analysis_json,
        duplicate_status=duplicate_status,
        cover_letter=cover_letter,
        screening_answers=screening_answers,
        status=initial_status,
        created_by=app_req.created_by
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application

@app.post("/match/analyze", response_model=MatchAnalyzeResponse)
def analyze_match(
    req: MatchAnalyzeRequest,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate_name = f"{candidate.first_name} {candidate.last_name}"

    match_analysis = analyze_structured_match(
        candidate_name=candidate_name,
        resume_text=candidate.resume_text or "",
        company_name=req.company_name,
        job_title=req.job_title,
        job_description=req.job_description
    )

    return match_analysis

@app.get("/applications")
def list_applications(
    status: str | None = None,
    created_by: str | None = None,
    candidate_id: int | None = None,
    limit: int = 25,
    db: Session = Depends(get_db)
):
    query = db.query(Application)

    if status:
        query = query.filter(Application.status == status)

    if created_by:
        query = query.filter(Application.created_by == created_by)

    if candidate_id:
        query = query.filter(Application.candidate_id == candidate_id)

    applications = query.order_by(Application.created_at.desc()).limit(limit).all()

    return applications

@app.get("/applications/export.csv")
def export_applications_csv(
    status: str | None = None,
    created_by: str | None = None,
    candidate_id: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 500,
    db: Session = Depends(get_db)
):
    """
    Export applications as CSV with optional filters.

    Examples:
    /applications/export.csv
    /applications/export.csv?status=Submitted
    /applications/export.csv?created_by=David
    /applications/export.csv?candidate_id=1
    /applications/export.csv?start_date=2026-05-01&end_date=2026-05-05
    """

    query = db.query(Application)

    if status:
      query = query.filter(Application.status == status)

    if created_by:
      query = query.filter(Application.created_by == created_by)

    if candidate_id:
      query = query.filter(Application.candidate_id == candidate_id)

    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            start_datetime = datetime.combine(parsed_start, time.min)
            query = query.filter(Application.created_at >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid start_date format. Use YYYY-MM-DD."
            )

    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            end_datetime = datetime.combine(parsed_end, time.max)
            query = query.filter(Application.created_at <= end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid end_date format. Use YYYY-MM-DD."
            )

    applications = query.order_by(Application.created_at.desc()).limit(limit).all()

    output = StringIO()

    fieldnames = [
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

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for app_item in applications:
        candidate_name = "Unknown Candidate"

        if app_item.candidate:
            candidate_name = f"{app_item.candidate.first_name} {app_item.candidate.last_name}"

        writer.writerow({
            "application_id": app_item.id,
            "candidate_id": app_item.candidate_id,
            "candidate_name": candidate_name,
            "company_name": app_item.company_name,
            "job_title": app_item.job_title,
            "created_by": app_item.created_by or "Unknown",
            "status": app_item.status,
            "match_score": app_item.match_score,
            "duplicate_status": app_item.duplicate_status,
            "original_job_url": app_item.original_job_url,
            "canonical_job_url": app_item.canonical_job_url,
            "submitted_at": app_item.submitted_at.isoformat() if app_item.submitted_at else "",
            "created_at": app_item.created_at.isoformat() if app_item.created_at else "",
            "manager_override_used": app_item.manager_override_used or "No",
            "manager_override_by": app_item.manager_override_by or "",
            "manager_override_reason": app_item.manager_override_reason or "",
            "manager_override_at": app_item.manager_override_at.isoformat() if app_item.manager_override_at else ""
        })

    output.seek(0)

    filename = f"applications_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
@app.get("/applications/find-existing", response_model=ApplicationResponse | None)
def find_existing_application(
    candidate_id: int,
    original_job_url: str,
    db: Session = Depends(get_db)
):
    canonical_url = create_canonical_url(original_job_url)

    application = db.query(Application).filter(
        Application.candidate_id == candidate_id,
        Application.canonical_job_url == canonical_url
    ).order_by(Application.created_at.desc()).first()

    return application

@app.get("/applications/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return application

@app.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    status_update: ApplicationStatusOverrideUpdate,
    db: Session = Depends(get_db)
):
    allowed_statuses = {
        "Draft Generated",
        "Needs Review",
        "Approved",
        "Submitted",
        "Duplicate",
        "Skipped - Low Match",
        "Failed"
    }

    if status_update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid application status")

    application = db.query(Application).filter(Application.id == application_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    is_exact_duplicate = application.duplicate_status == "Exact Duplicate"
    is_low_match = application.match_score is not None and application.match_score < 60
    is_blocked_submit = status_update.status == "Submitted" and (is_exact_duplicate or is_low_match)

    if is_blocked_submit:
        expected_code = os.getenv("MANAGER_OVERRIDE_CODE", "")

        if not status_update.override_code or status_update.override_code != expected_code:
            raise HTTPException(
                status_code=400,
                detail="Manager override required for duplicate or low match submission."
            )

        if not status_update.override_reason:
            raise HTTPException(
                status_code=400,
                detail="Override reason is required."
            )

        application.manager_override_used = "Yes"
        application.manager_override_reason = status_update.override_reason
        application.manager_override_by = status_update.override_by or "Unknown Manager"
        application.manager_override_at = datetime.utcnow()

    application.status = status_update.status

    if status_update.status == "Submitted" and not application.submitted_at:
        application.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(application)

    return application

def build_daily_report_data(report_date: str, db: Session):
    try:
        selected_date = datetime.strptime(report_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    start_datetime = datetime.combine(selected_date, time.min)
    end_datetime = datetime.combine(selected_date, time.max)

    applications_created_today = db.query(Application).filter(
        Application.created_at >= start_datetime,
        Application.created_at <= end_datetime
    ).all()

    applications_submitted_today = db.query(Application).filter(
        Application.submitted_at >= start_datetime,
        Application.submitted_at <= end_datetime
    ).all()

    def count_by_status(applications):
        status_counts = {}

        for app_item in applications:
            status_counts[app_item.status] = status_counts.get(app_item.status, 0) + 1

        return status_counts

    def count_by_created_by(applications):
        bidder_counts = {}

        for app_item in applications:
            bidder = app_item.created_by or "Unknown"
            bidder_counts[bidder] = bidder_counts.get(bidder, 0) + 1

        return bidder_counts

    def count_by_candidate(applications):
        candidate_counts = {}

        for app_item in applications:
            if app_item.candidate:
                candidate_name = f"{app_item.candidate.first_name} {app_item.candidate.last_name}"
            else:
                candidate_name = "Unknown Candidate"

            candidate_counts[candidate_name] = candidate_counts.get(candidate_name, 0) + 1

        return candidate_counts

    low_match_applications = [
        {
            "id": app_item.id,
            "candidate_id": app_item.candidate_id,
            "company_name": app_item.company_name,
            "job_title": app_item.job_title,
            "match_score": app_item.match_score,
            "status": app_item.status,
            "created_by": app_item.created_by,
            "original_job_url": app_item.original_job_url
        }
        for app_item in applications_created_today
        if app_item.match_score is not None and app_item.match_score < 60
    ]

    duplicate_applications = [
        {
            "id": app_item.id,
            "candidate_id": app_item.candidate_id,
            "company_name": app_item.company_name,
            "job_title": app_item.job_title,
            "duplicate_status": app_item.duplicate_status,
            "status": app_item.status,
            "created_by": app_item.created_by,
            "original_job_url": app_item.original_job_url
        }
        for app_item in applications_created_today
        if app_item.duplicate_status in ["Exact Duplicate", "Possible Duplicate"]
    ]

    return {
        "report_date": selected_date.isoformat(),
        "summary": {
            "total_created": len(applications_created_today),
            "total_submitted": len(applications_submitted_today),
            "total_low_match": len(low_match_applications),
            "total_duplicates": len(duplicate_applications),
            "status_counts_created_today": count_by_status(applications_created_today)
        },
        "by_bidder": count_by_created_by(applications_created_today),
        "by_candidate": count_by_candidate(applications_created_today),
        "submitted_today": [
            {
                "id": app_item.id,
                "candidate_id": app_item.candidate_id,
                "company_name": app_item.company_name,
                "job_title": app_item.job_title,
                "match_score": app_item.match_score,
                "status": app_item.status,
                "created_by": app_item.created_by,
                "submitted_at": app_item.submitted_at,
                "original_job_url": app_item.original_job_url
            }
            for app_item in applications_submitted_today
        ],
        "low_match_applications": low_match_applications,
        "duplicate_applications": duplicate_applications
    }

@app.get("/reports/daily")
def get_daily_report(report_date: str, db: Session = Depends(get_db)):
    return build_daily_report_data(report_date, db)

@app.get("/reports/daily.csv")
def export_daily_report_csv(report_date: str, db: Session = Depends(get_db)):
    """
    Export daily application report as CSV.

    Example:
    /reports/daily.csv?report_date=2026-05-05
    """

    try:
        selected_date = datetime.strptime(report_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    start_datetime = datetime.combine(selected_date, time.min)
    end_datetime = datetime.combine(selected_date, time.max)

    applications = db.query(Application).filter(
        Application.created_at >= start_datetime,
        Application.created_at <= end_datetime
    ).order_by(Application.created_at.desc()).all()

    output = StringIO()

    fieldnames = [
        "application_id",
        "report_date",
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

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for app_item in applications:
        candidate_name = "Unknown Candidate"

        if app_item.candidate:
            candidate_name = f"{app_item.candidate.first_name} {app_item.candidate.last_name}"

        writer.writerow({
            "application_id": app_item.id,
            "report_date": selected_date.isoformat(),
            "candidate_id": app_item.candidate_id,
            "candidate_name": candidate_name,
            "company_name": app_item.company_name,
            "job_title": app_item.job_title,
            "created_by": app_item.created_by or "Unknown",
            "status": app_item.status,
            "match_score": app_item.match_score,
            "duplicate_status": app_item.duplicate_status,
            "original_job_url": app_item.original_job_url,
            "canonical_job_url": app_item.canonical_job_url,
            "submitted_at": app_item.submitted_at.isoformat() if app_item.submitted_at else "",
            "created_at": app_item.created_at.isoformat() if app_item.created_at else "",
            "manager_override_used": app_item.manager_override_used or "No",
            "manager_override_by": app_item.manager_override_by or "",
            "manager_override_reason": app_item.manager_override_reason or "",
            "manager_override_at": app_item.manager_override_at.isoformat() if app_item.manager_override_at else ""
        })

    output.seek(0)

    filename = f"daily_application_report_{selected_date.isoformat()}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@app.post("/sync/google-sheets/applications")
def sync_applications_google_sheets(
    status: str | None = None,
    created_by: str | None = None,
    candidate_id: int | None = None,
    limit: int = 100,
    triggered_by: str | None = None,
    today_only: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Application)

    if today_only:
        selected_date = datetime.utcnow().date()
        start_datetime = datetime.combine(selected_date, time.min)
        end_datetime = datetime.combine(selected_date, time.max)

        query = query.filter(
            Application.created_at >= start_datetime,
            Application.created_at <= end_datetime
        )

    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            start_datetime = datetime.combine(parsed_start, time.min)
            query = query.filter(Application.created_at >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid start_date format. Use YYYY-MM-DD."
            )

    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            end_datetime = datetime.combine(parsed_end, time.max)
            query = query.filter(Application.created_at <= end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid end_date format. Use YYYY-MM-DD."
            )
            
    if status:
        query = query.filter(Application.status == status)

    if created_by:
        query = query.filter(Application.created_by == created_by)

    if candidate_id:
        query = query.filter(Application.candidate_id == candidate_id)

    applications = query.order_by(Application.created_at.desc()).limit(limit).all()

    sync_log = GoogleSheetsSyncLog(
        triggered_by=triggered_by or created_by or "Unknown",
        status_filter=status,
        created_by_filter=created_by,
        candidate_id_filter=candidate_id,
        limit_filter=limit,
        today_only_filter="Yes" if today_only else "No",
        start_date_filter=start_date,
        end_date_filter=end_date,
        sync_status="Started"
    )

    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    try:
        result = sync_applications_to_sheet(applications)

        sync_log.rows_synced = result["rows_synced"]
        sync_log.rows_updated = result["rows_updated"]
        sync_log.rows_skipped = result["rows_skipped"]
        sync_log.sync_status = "Success"
        sync_log.error_message = None

        db.commit()
        db.refresh(sync_log)

        return {
            "message": "Applications synced to Google Sheets",
            "sync_log_id": sync_log.id,
            "filters": {
                "status": status,
                "created_by": created_by,
                "candidate_id": candidate_id,
                "limit": limit,
                "triggered_by": triggered_by
            },
            "rows_synced": result["rows_synced"],
            "rows_updated": result["rows_updated"],
            "rows_skipped": result["rows_skipped"],
            "appended_application_ids": result["appended_application_ids"],
            "updated_application_ids": result["updated_application_ids"],
            "worksheet": result["worksheet"]
        }

    except Exception as error:
        sync_log.sync_status = "Failed"
        sync_log.error_message = str(error)

        db.commit()
        db.refresh(sync_log)

        raise HTTPException(
            status_code=500,
            detail=f"Google Sheets sync failed: {str(error)}"
        )
    query = db.query(Application)

    if status:
        query = query.filter(Application.status == status)

    if created_by:
        query = query.filter(Application.created_by == created_by)

    if candidate_id:
        query = query.filter(Application.candidate_id == candidate_id)

    applications = query.order_by(Application.created_at.desc()).limit(limit).all()

    result = sync_applications_to_sheet(applications)

    return {
        "message": "Applications synced to Google Sheets",
        "filters": {
            "status": status,
            "created_by": created_by,
            "candidate_id": candidate_id,
            "limit": limit,
            "triggered_by": triggered_by,
            "today_only": today_only,
            "start_date": start_date,
            "end_date": end_date
        },
        "rows_synced": result["rows_synced"],
        "rows_updated": result["rows_updated"],
        "rows_skipped": result["rows_skipped"],
        "appended_application_ids": result["appended_application_ids"],
        "updated_application_ids": result["updated_application_ids"],
        "worksheet": result["worksheet"]
    }

@app.get("/sync/google-sheets/logs", response_model=list[GoogleSheetsSyncLogResponse])
def list_google_sheets_sync_logs(
    limit: int = 25,
    db: Session = Depends(get_db)
):
    logs = db.query(GoogleSheetsSyncLog).order_by(
        GoogleSheetsSyncLog.created_at.desc()
    ).limit(limit).all()

    return logs

@app.post("/sync/google-sheets/dashboard")
def sync_google_sheets_dashboard(
    report_date: str,
    db: Session = Depends(get_db)
):
    dashboard_data = build_daily_report_data(report_date, db)

    result = sync_dashboard_to_sheet(
        report_date=report_date,
        dashboard_data=dashboard_data
    )

    return {
        "message": "Dashboard synced to Google Sheets",
        "report_date": report_date,
        "worksheet": result["worksheet"],
        "rows_written": result["rows_written"],
        "summary": dashboard_data["summary"]
    }

@app.post("/slack/daily-report")
def send_slack_daily_report(
    report_date: str,
    triggered_by: str | None = None,
    db: Session = Depends(get_db)
):
    report_data = build_daily_report_data(report_date, db)
    summary = report_data.get("summary", {})

    slack_log = SlackReportLog(
        report_date=report_date,
        triggered_by=triggered_by or "Unknown",
        total_created=summary.get("total_created", 0),
        total_submitted=summary.get("total_submitted", 0),
        total_low_match=summary.get("total_low_match", 0),
        total_duplicates=summary.get("total_duplicates", 0),
        slack_status="Started"
    )

    db.add(slack_log)
    db.commit()
    db.refresh(slack_log)

    try:
        slack_message = format_daily_report_for_slack(report_data)
        result = send_slack_message(slack_message)

        slack_log.slack_status = "Success"
        slack_log.slack_status_code = result.get("status_code")
        slack_log.error_message = None

        db.commit()
        db.refresh(slack_log)

        return {
            "message": "Daily report sent to Slack",
            "slack_log_id": slack_log.id,
            "report_date": report_date,
            "triggered_by": triggered_by,
            "slack_status": result["status"],
            "status_code": result["status_code"],
            "summary": report_data["summary"]
        }

    except Exception as error:
        slack_log.slack_status = "Failed"
        slack_log.error_message = str(error)

        db.commit()
        db.refresh(slack_log)

        raise HTTPException(
            status_code=500,
            detail=f"Slack daily report failed: {str(error)}"
        )

@app.get("/slack/logs", response_model=list[SlackReportLogResponse])
def list_slack_report_logs(
    limit: int = 25,
    db: Session = Depends(get_db)
):
    logs = db.query(SlackReportLog).order_by(
        SlackReportLog.created_at.desc()
    ).limit(limit).all()

    return logs

@app.post("/detect-job-page", response_model=JobPageDetectResponse)
def detect_job_page(req: JobPageDetectRequest):
    result = detect_job_page_with_ai(
        url=req.url,
        page_title=req.page_title,
        page_text=req.page_text
    )

    return {
        "is_job_posting": result.get("is_job_posting", False),
        "confidence": result.get("confidence", "Low"),
        "company_name": result.get("company_name"),
        "job_title": result.get("job_title"),
        "reason": result.get("reason")
    }

def normalize_question_text(text: str) -> str:
    return " ".join((text or "").lower().replace("?", " ").replace(".", " ").split())


def saved_answer_matches_question(saved_answer: CandidateAnswer, question: str) -> bool:
    question_norm = normalize_question_text(question)
    label_norm = normalize_question_text(saved_answer.question_label)
    key_norm = normalize_question_text(saved_answer.question_key)

    if not question_norm:
        return False

    # Direct label match
    if label_norm and (label_norm in question_norm or question_norm in label_norm):
        return True

    # Key-based matching
    key_aliases = {
        "work_authorization": [
            "authorized",
            "authorization",
            "eligible to work",
            "legally authorized",
            "work in the united states",
            "work in us",
            "work in the us"
        ],
        "sponsorship": [
            "sponsorship",
            "sponsor",
            "visa",
            "now or in the future",
            "require sponsorship"
        ],
        "salary_expectation": [
            "salary",
            "compensation",
            "expected pay",
            "pay range",
            "desired salary"
        ],
        "remote_preference": [
            "remote",
            "hybrid",
            "onsite",
            "work from home"
        ],
        "relocation": [
            "relocate",
            "relocation",
            "willing to move"
        ],
        "notice_period": [
            "notice period",
            "start date",
            "available to start",
            "availability"
        ],
        "travel": [
            "travel",
            "willing to travel"
        ],
        "security_clearance": [
            "security clearance",
            "clearance"
        ],
        "timezone": [
            "timezone",
            "time zone",
            "working hours"
        ]
    }

    aliases = key_aliases.get(saved_answer.question_key, [])

    if any(alias in question_norm for alias in aliases):
        return True

    # If key itself appears in the question after normalization
    if key_norm and key_norm in question_norm:
        return True

    return False


def find_saved_answer_for_question(saved_answers: list[CandidateAnswer], question: str):
    for saved_answer in saved_answers:
        if saved_answer_matches_question(saved_answer, question):
            return saved_answer

    return None

def normalize_answer_text(value: str) -> str:
    return " ".join((value or "").lower().strip().split())


def pick_option_from_answer(field, answer_text: str):
    options = field.options or []

    if not options:
        return None

    answer_norm = normalize_answer_text(answer_text)

    # Exact match first
    for option in options:
        label_norm = normalize_answer_text(option.label)
        value_norm = normalize_answer_text(option.value or "")

        if answer_norm and (answer_norm == label_norm or answer_norm == value_norm):
            return option

    # Yes/no shortcut
    if answer_norm.startswith("yes"):
      for option in options:
          label_norm = normalize_answer_text(option.label)
          value_norm = normalize_answer_text(option.value or "")

          if "yes" in label_norm or value_norm == "yes" or value_norm == "true":
              return option

    if answer_norm.startswith("no"):
      for option in options:
          label_norm = normalize_answer_text(option.label)
          value_norm = normalize_answer_text(option.value or "")

          if "no" in label_norm or value_norm == "no" or value_norm == "false":
              return option

    # Contains match
    for option in options:
        label_norm = normalize_answer_text(option.label)
        value_norm = normalize_answer_text(option.value or "")

        if label_norm and label_norm in answer_norm:
            return option

        if value_norm and value_norm in answer_norm:
            return option

    return None

@app.post("/screening/autofill-answers", response_model=ScreeningAutofillResponse)
def generate_screening_autofill_answers(
    req: ScreeningAutofillRequest,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    saved_answers = db.query(CandidateAnswer).filter(
        CandidateAnswer.candidate_id == req.candidate_id
    ).all()

    questions = [field.label for field in req.fields]

    candidate_profile = {
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "location": candidate.location,
        "linkedin": candidate.linkedin,
        "github": candidate.github,
        "portfolio": candidate.portfolio,
        "work_authorization": candidate.work_authorization,
        "sponsorship_required": candidate.sponsorship_required,
        "expected_salary": candidate.expected_salary,
    }

    raw_answers = generate_screening_answers(
        resume_text=candidate.resume_text or "",
        candidate_profile=candidate_profile,
        questions=questions
    )

    try:
        parsed_answers = json.loads(raw_answers)
    except Exception:
        parsed_answers = []

    answers = []

    for index, field in enumerate(req.fields):
        saved_answer = find_saved_answer_for_question(saved_answers, field.label)

        if saved_answer:
            selected_option = pick_option_from_answer(field, saved_answer.answer)

            answers.append({
                "fieldId": field.fieldId,
                "fieldType": field.fieldType,
                "question": field.label,
                "answer": saved_answer.answer,
                "selected_option_label": selected_option.label if selected_option else None,
                "selected_option_value": selected_option.value if selected_option else None,
                "selected_option_index": selected_option.index if selected_option else None,
                "confidence": "High",
                "manual_review_required": False if field.fieldType not in ["radio", "select", "checkbox"] or selected_option else True,
                "reason": "Matched from saved candidate answer library."
            })
            continue

        answer_item = parsed_answers[index] if index < len(parsed_answers) else {}

        answer_text = answer_item.get("answer", "")
        selected_option = pick_option_from_answer(field, answer_text)

        is_choice_field = field.fieldType in ["radio", "select", "checkbox"]

        answers.append({
            "fieldId": field.fieldId,
            "fieldType": field.fieldType,
            "question": field.label,
            "answer": answer_text,
            "selected_option_label": selected_option.label if selected_option else answer_item.get("selected_option_label"),
            "selected_option_value": selected_option.value if selected_option else answer_item.get("selected_option_value"),
            "selected_option_index": selected_option.index if selected_option else answer_item.get("selected_option_index"),
            "confidence": answer_item.get("confidence", "Low"),
            "manual_review_required": True if is_choice_field and not selected_option else answer_item.get("manual_review_required", True),
            "reason": answer_item.get("reason", "")
        })

    return {
        "answers": answers
    }