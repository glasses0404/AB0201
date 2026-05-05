from pydantic import BaseModel
from typing import Optional, List


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

    class Config:
        from_attributes = True