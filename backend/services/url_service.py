from urllib.parse import urlparse, urlunparse


def preserve_original_url(url: str) -> str:
    """
    Keep the original job URL exactly as provided.
    This should never be modified.
    """
    return url.strip()


def create_canonical_url(url: str) -> str:
    """
    Create a cleaned URL only for duplicate detection.
    Do not overwrite the original URL.
    """
    parsed = urlparse(url.strip())

    clean = parsed._replace(
        query="",
        fragment=""
    )

    canonical = urlunparse(clean)

    if canonical.endswith("/"):
        canonical = canonical[:-1]

    return canonical.lower()