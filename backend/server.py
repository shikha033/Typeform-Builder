"""Compat shim so supervisor's `uvicorn server:app` continues to work."""
from app.main import app  # noqa: F401
