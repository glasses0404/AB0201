import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_cover_letter(
    candidate_name: str,
    resume_text: str,
    company_name: str,
    job_title: str,
    job_description: str
) -> str:
    prompt = f"""
You are writing a truthful, professional cover letter.

Rules:
- Use only facts from the resume.
- Do not invent companies, projects, years, tools, or achievements.
- Keep it concise.
- Make it specific to the company and job.
- Use a confident but natural tone.

Candidate Name:
{candidate_name}

Company:
{company_name}

Job Title:
{job_title}

Resume:
{resume_text}

Job Description:
{job_description}

Write a polished cover letter.
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a professional job application writing assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4
    )

    return response.choices[0].message.content.strip()