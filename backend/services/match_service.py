import re


def extract_keywords(text: str) -> set:
    common_words = {
        "and", "or", "the", "a", "an", "to", "of", "in", "for", "with",
        "on", "by", "is", "are", "as", "at", "from", "this", "that",
        "you", "we", "our", "your", "will", "be", "have", "has"
    }

    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#.\-]{1,}\b", text.lower())
    return {word for word in words if word not in common_words and len(word) > 2}


def calculate_match_score(resume_text: str, job_description: str) -> float:
    if not resume_text or not job_description:
        return 0.0

    resume_keywords = extract_keywords(resume_text)
    job_keywords = extract_keywords(job_description)

    if not job_keywords:
        return 0.0

    matched_keywords = resume_keywords.intersection(job_keywords)
    score = len(matched_keywords) / len(job_keywords) * 100

    return round(min(score, 100), 2)