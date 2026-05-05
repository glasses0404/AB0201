import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def detect_job_page_with_ai(url: str, page_title: str, page_text: str) -> dict:
    prompt = f"""
You determine whether a webpage is a job posting page.

Rules:
- Return only valid JSON.
- A job posting page usually has job title, company, responsibilities, qualifications, apply button, location, employment type, salary, or screening questions.
- Do not classify general career search pages, company homepages, blogs, or login pages as job postings unless there is a specific job role shown.
- Confidence must be High, Medium, or Low.

URL:
{url}

Page Title:
{page_title}

Page Text:
{page_text[:10000]}

Return JSON in this exact format:
{{
  "is_job_posting": true,
  "confidence": "High",
  "company_name": "...",
  "job_title": "...",
  "reason": "Short explanation"
}}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You classify web pages and extract job posting metadata."
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
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "is_job_posting": False,
            "confidence": "Low",
            "company_name": None,
            "job_title": None,
            "reason": "AI response was not valid JSON.",
            "raw_response": raw
        }