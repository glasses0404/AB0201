from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base
from pydantic import BaseModel

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)

    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)

    work_authorization = Column(String, nullable=True)
    sponsorship_required = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)

    resume_text = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="candidate")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    candidate_id = Column(Integer, ForeignKey("candidates.id"))

    company_name = Column(String, nullable=False)
    job_title = Column(String, nullable=False)

    original_job_url = Column(Text, nullable=False)
    canonical_job_url = Column(Text, nullable=True)
    application_url = Column(Text, nullable=True)

    job_description = Column(Text, nullable=False)

    match_score = Column(Float, nullable=True)
    duplicate_status = Column(String, default="Not Checked")

    cover_letter = Column(Text, nullable=True)
    screening_answers = Column(Text, nullable=True)

    status = Column(String, default="Draft Generated")

    manager_override_used = Column(String, default="No")
    manager_override_reason = Column(Text, nullable=True)
    manager_override_by = Column(String, nullable=True)
    manager_override_at = Column(DateTime, nullable=True)

    created_by = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="applications")

class GoogleSheetsSyncLog(Base):
    __tablename__ = "google_sheets_sync_logs"

    id = Column(Integer, primary_key=True, index=True)

    triggered_by = Column(String, nullable=True)

    status_filter = Column(String, nullable=True)
    created_by_filter = Column(String, nullable=True)
    candidate_id_filter = Column(Integer, nullable=True)
    limit_filter = Column(Integer, nullable=True)
    today_only_filter = Column(String, nullable=True)
    start_date_filter = Column(String, nullable=True)
    end_date_filter = Column(String, nullable=True)

    rows_synced = Column(Integer, default=0)
    rows_updated = Column(Integer, default=0)
    rows_skipped = Column(Integer, default=0)

    sync_status = Column(String, default="Success")
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)