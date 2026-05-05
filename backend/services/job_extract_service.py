import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def extract_job_info_with_ai(url: str, page_title: str, page_text: str) -> dict:
    prompt = f"""
Extract the exact job title and company name from this job posting page.

Rules:
- Return only valid JSON.
- Do not invent information.
- If company name is unclear, use null.
- If job title is unclear, use null.
- Avoid ATS/platform names like Greenhouse, Lever, Workday, Ashby, LinkedIn, Indeed, ZipRecruiter.
- Prefer the actual hiring company.
- Prefer the exact job title shown on the page.
- Confidence must be High, Medium, or Low.

URL:
{url}

Page Title:
{page_title}

Page Text:
{page_text[:12000]}

Return JSON in this exact format:
{{
  "company_name": "...",
  "job_title": "...",
  "confidence": "High",
  "reason": "Short explanation"
}}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You extract structured job posting information from web page text."
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
            "company_name": None,
            "job_title": None,
            "confidence": "Low",
            "reason": "AI response was not valid JSON.",
            "raw_response": raw
        }