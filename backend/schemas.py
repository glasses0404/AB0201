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
    match_analysis_json: Optional[str] = None
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
    today_only_filter: Optional[str] = None
    start_date_filter: Optional[str] = None
    end_date_filter: Optional[str] = None

    rows_synced: int
    rows_updated: int
    rows_skipped: int

    sync_status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SlackReportLogResponse(BaseModel):
    id: int

    report_date: str
    triggered_by: Optional[str] = None

    total_created: int
    total_submitted: int
    total_low_match: int
    total_duplicates: int

    slack_status: str
    slack_status_code: Optional[int] = None
    error_message: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True

class JobPageDetectRequest(BaseModel):
    url: str
    page_title: str
    page_text: str


class JobPageDetectResponse(BaseModel):
    is_job_posting: bool
    confidence: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    reason: Optional[str] = None

class ScreeningFieldOption(BaseModel):
    label: str
    value: Optional[str] = None
    index: Optional[int] = None

class ScreeningField(BaseModel):
    fieldId: str
    fieldType: str
    inputType: Optional[str] = None
    label: str
    options: Optional[List[ScreeningFieldOption]] = []


class ScreeningAutofillRequest(BaseModel):
    candidate_id: int
    fields: List[ScreeningField]


class ScreeningAutofillAnswer(BaseModel):
    fieldId: str
    fieldType: Optional[str] = None
    question: str
    answer: str
    selected_option_label: Optional[str] = None
    selected_option_value: Optional[str] = None
    selected_option_index: Optional[int] = None
    confidence: str
    manual_review_required: bool
    reason: Optional[str] = None


class ScreeningAutofillResponse(BaseModel):
    answers: List[ScreeningAutofillAnswer]

class CandidateAnswerCreate(BaseModel):
    question_key: str
    question_label: str
    answer: str
    answer_type: Optional[str] = "short"


class CandidateAnswerUpdate(BaseModel):
    question_key: Optional[str] = None
    question_label: Optional[str] = None
    answer: Optional[str] = None
    answer_type: Optional[str] = None


class CandidateAnswerResponse(BaseModel):
    id: int
    candidate_id: int

    question_key: str
    question_label: str
    answer: str
    answer_type: str

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MatchAnalyzeRequest(BaseModel):
    candidate_id: int
    company_name: str
    job_title: str
    job_description: str


class MatchAnalyzeResponse(BaseModel):
    overall_score: int
    recommendation: str
    summary: str

    required_skills_score: int
    preferred_skills_score: int
    industry_score: int
    seniority_score: int
    location_score: int

    required_skills: List[str]
    preferred_skills: List[str]
    matched_skills: List[str]
    missing_required_skills: List[str]
    missing_preferred_skills: List[str]
    risk_flags: List[str]
    strengths: List[str]

    reasoning: str

