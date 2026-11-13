"""Entry point for hosts that look for a root-level app (Vercel, etc.).

The real application lives in app/api.py. Locally you still run:  uvicorn app.api:app --reload
"""
from app.api import app  # noqa: F401  (Vercel looks for a variable named `app` here)
