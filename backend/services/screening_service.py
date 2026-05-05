import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_screening_answers(
    resume_text: str,
    candidate_profile: dict,
    questions: list[str]
) -> str:
    if not questions:
        return json.dumps([], indent=2)

    prompt = f"""
You answer job application screening questions truthfully.

Rules:
- Use only the resume and candidate profile.
- Do not invent experience.
- If the answer is not supported, say it honestly.
- For sensitive questions, say "Manual Review Required" unless the candidate profile clearly provides the answer.
- Keep answers short and application-ready.

Candidate Profile:
{json.dumps(candidate_profile, indent=2)}

Resume:
{resume_text}

Screening Questions:
{json.dumps(questions, indent=2)}

Return valid JSON in this format:
[
  {{
    "question": "...",
    "answer": "...",
    "confidence": "High/Medium/Low",
    "manual_review_required": true/false
  }}
]
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a truthful job application screening assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return response.choices[0].message.content.strip()