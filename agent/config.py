"""Central configuration for the Job Scout agent.

The Claude API key is read from the UCOMBA environment variable (also accepted:
UCOMBA_API_KEY, UCO_MBA_API_KEY, UCO_MBA).
Never hard-code the key or commit it; put it in a local .env file (git-ignored)
or in your hosting provider's secret settings (e.g. Vercel / Supabase).
"""
import os

API_KEY_ENVS = ("UCOMBA", "UCOMBA_API_KEY", "UCO_MBA_API_KEY", "UCO_MBA")

# Small, fast model for high-volume labeling; larger model for hard careers pages.
LABEL_MODEL = "claude-haiku-4-5-20251001"
EXTRACT_MODEL = "claude-sonnet-5-5"


def get_api_key() -> str:
    for name in API_KEY_ENVS:
        if os.environ.get(name):
            return os.environ[name]
    raise RuntimeError(
        "UCOMBA is not set. Add it to your .env file or hosting secrets."
    )


def get_client():
    import anthropic

    return anthropic.Anthropic(api_key=get_api_key())
