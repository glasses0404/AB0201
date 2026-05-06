from typing import Optional, List, Any
from pydantic import BaseModel


class BidderLoginRequest(BaseModel):
    access_code: str


class BidderLoginResponse(BaseModel):
    access_token: str
    bidder: dict
    candidate: Optional[dict] = None


class BidderCreateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    access_code: str
    assigned_candidate_id: Optional[str] = None
    role: str = "bidder"
    is_active: bool = True


class CandidateProfileCreateRequest(BaseModel):
    bidder_id: Optional[str] = None
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
    resume_file: Optional[dict] = None


class CandidateAnswerCreateRequest(BaseModel):
    candidate_id: str
    question_key: str
    question_label: str
    answer: str
    answer_type: str = "short"


class CloudApplicationCreateRequest(BaseModel):
    bidder_id: str
    candidate_id: str
    company_name: str
    job_title: str
    original_job_url: str
    canonical_job_url: Optional[str] = None
    ats_type: Optional[str] = None
    job_description: str
    screening_questions: List[str] = []
    created_by: Optional[str] = None