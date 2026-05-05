import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def analyze_structured_match(
    candidate_name: str,
    resume_text: str,
    job_title: str,
    company_name: str,
    job_description: str
) -> dict:
    prompt = f"""
You are analyzing how well a candidate matches a job.

Rules:
- Use only the resume and job description.
- Do not invent experience.
- Be strict but fair.
- If a required skill is missing, include it in missing_required_skills.
- If the candidate has similar experience, mention it in risk_flags or summary.
- Scores must be integers from 0 to 100.
- recommendation must be one of: "Apply", "Needs Review", "Skip".
- Return only valid JSON.

Candidate Name:
{candidate_name}

Resume:
{resume_text}

Company:
{company_name}

Job Title:
{job_title}

Job Description:
{job_description}

Return JSON exactly in this format:
{{
  "overall_score": 0,
  "recommendation": "Apply",
  "summary": "Short summary of the match.",
  "required_skills_score": 0,
  "preferred_skills_score": 0,
  "industry_score": 0,
  "seniority_score": 0,
  "location_score": 0,
  "required_skills": [],
  "preferred_skills": [],
  "matched_skills": [],
  "missing_required_skills": [],
  "missing_preferred_skills": [],
  "risk_flags": [],
  "strengths": [],
  "reasoning": "Short explanation."
}}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a strict resume-to-job match scoring engine."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1
    )

    raw = response.choices[0].message.content.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "overall_score": 0,
            "recommendation": "Needs Review",
            "summary": "Could not parse AI match analysis.",
            "required_skills_score": 0,
            "preferred_skills_score": 0,
            "industry_score": 0,
            "seniority_score": 0,
            "location_score": 0,
            "required_skills": [],
            "preferred_skills": [],
            "matched_skills": [],
            "missing_required_skills": [],
            "missing_preferred_skills": [],
            "risk_flags": ["AI response was not valid JSON."],
            "strengths": [],
            "reasoning": raw
        }

    # Defensive defaults
    data.setdefault("overall_score", 0)
    data.setdefault("recommendation", "Needs Review")
    data.setdefault("summary", "")
    data.setdefault("required_skills_score", 0)
    data.setdefault("preferred_skills_score", 0)
    data.setdefault("industry_score", 0)
    data.setdefault("seniority_score", 0)
    data.setdefault("location_score", 0)
    data.setdefault("required_skills", [])
    data.setdefault("preferred_skills", [])
    data.setdefault("matched_skills", [])
    data.setdefault("missing_required_skills", [])
    data.setdefault("missing_preferred_skills", [])
    data.setdefault("risk_flags", [])
    data.setdefault("strengths", [])
    data.setdefault("reasoning", "")

    try:
        data["overall_score"] = int(data.get("overall_score", 0))
    except Exception:
        data["overall_score"] = 0

    if data["overall_score"] >= 85:
        data["recommendation"] = "Apply"
    elif data["overall_score"] >= 70:
        data["recommendation"] = "Needs Review"
    else:
        data["recommendation"] = "Skip"

    if data.get("missing_required_skills"):
        if data["overall_score"] >= 85:
            data["recommendation"] = "Needs Review"

    return data