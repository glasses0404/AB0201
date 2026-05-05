from sqlalchemy.orm import Session
from models import Application


def check_duplicate(
    db: Session,
    candidate_id: int,
    company_name: str,
    job_title: str,
    canonical_job_url: str
) -> str:
    exact_url_duplicate = db.query(Application).filter(
        Application.candidate_id == candidate_id,
        Application.canonical_job_url == canonical_job_url
    ).first()

    if exact_url_duplicate:
        return "Exact Duplicate"

    title_company_duplicate = db.query(Application).filter(
        Application.candidate_id == candidate_id,
        Application.company_name.ilike(company_name),
        Application.job_title.ilike(job_title)
    ).first()

    if title_company_duplicate:
        return "Possible Duplicate"

    return "Unique"