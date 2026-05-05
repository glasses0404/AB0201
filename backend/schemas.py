from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

    work_authorization: Optional[str] = None
    sponsorship_required: Optional[str] = None
    expected_salary: Optional[str] = None

    resume_text: Optional[str] = None


class CandidateResponse(CandidateCreate):
    id: int

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    candidate_id: int
    company_name: str
    job_title: str
    original_job_url: str
    job_description: str
    screening_questions: Optional[List[str]] = []
    created_by: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    company_name: str
    job_title: str
    original_job_url: str
    canonical_job_url: Optional[str]
    match_score: Optional[float]
    duplicate_status: Optional[str]
    cover_letter: Optional[str]
    screening_answers: Optional[str]
    status: str
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    manager_override_used: Optional[str] = None
    manager_override_reason: Optional[str] = None
    manager_override_by: Optional[str] = None
    manager_override_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class JobExtractRequest(BaseModel):
    url: str
    page_title: str
    page_text: str


class JobExtractResponse(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    confidence: str
    reason: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str

class ApplicationStatusOverrideUpdate(BaseModel):
    status: str
    override_code: Optional[str] = None
    override_reason: Optional[str] = None
    override_by: Optional[str] = None

class GoogleSheetsSyncLogResponse(BaseModel):
    id: int
    triggered_by: Optional[str] = None

    status_filter: Optional[str] = None
    created_by_filter: Optional[str] = None
    candidate_id_filter: Optional[int] = None
    limit_filter: Optional[int] = None

    rows_synced: int
    rows_updated: int
    rows_skipped: int

    sync_status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True