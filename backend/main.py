from datetime import datetime, date, time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Candidate, Application
from schemas import (
    CandidateCreate,
    CandidateResponse,
    ApplicationCreate,
    ApplicationResponse,
    JobExtractRequest,
    JobExtractResponse,
    ApplicationStatusUpdate
)

from services.url_service import preserve_original_url, create_canonical_url
from services.duplicate_service import check_duplicate
from services.match_service import calculate_match_score
from services.cover_letter_service import generate_cover_letter
from services.screening_service import generate_screening_answers
from services.job_extract_service import extract_job_info_with_ai

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


@app.post("/candidates", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    new_candidate = Candidate(**candidate.dict())
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    return new_candidate

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

    match_score = calculate_match_score(
        resume_text=candidate.resume_text or "",
        job_description=app_req.job_description
    )

    candidate_name = f"{candidate.first_name} {candidate.last_name}"

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

    initial_status = "Duplicate" if duplicate_status == "Exact Duplicate" else "Draft Generated"

    new_application = Application(
        candidate_id=app_req.candidate_id,
        company_name=app_req.company_name,
        job_title=app_req.job_title,
        original_job_url=original_url,
        canonical_job_url=canonical_url,
        application_url=original_url,
        job_description=app_req.job_description,
        match_score=match_score,
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


@app.get("/applications")
def list_applications(db: Session = Depends(get_db)):
    applications = db.query(Application).order_by(Application.created_at.desc()).all()
    return applications


@app.get("/applications/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return application

@app.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    status_update: ApplicationStatusUpdate,
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

    if application.duplicate_status == "Exact Duplicate" and status_update.status == "Submitted":
    raise HTTPException(
        status_code=400,
        detail="Exact duplicate applications cannot be marked as Submitted."
    )

    application.status = status_update.status

    if status_update.status == "Submitted" and not application.submitted_at:
        application.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(application)

    return application

@app.get("/reports/daily")
def get_daily_report(report_date: str, db: Session = Depends(get_db)):
    """
    Daily report for applications created/submitted on a selected date.

    Example:
    /reports/daily?report_date=2026-05-05
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