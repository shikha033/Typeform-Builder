"""FastAPI entrypoint."""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from app.database import init_db  # noqa: E402
from app.routers import forms as forms_router  # noqa: E402
from app.routers import public as public_router  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Typeform Clone API", version="1.0.0")

# API router with /api prefix
api_router = APIRouter(prefix="/api")


@api_router.get("/")
def root():
    return {"message": "Typeform Clone API", "status": "ok"}


@api_router.get("/health")
def health():
    return {"status": "ok"}


api_router.include_router(forms_router.router)
api_router.include_router(public_router.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.on_event("startup")
def _startup() -> None:
    init_db()
    logger.info("Database initialized.")
    # Auto-seed if DB is empty
    from app.database import SessionLocal
    from app import models
    db = SessionLocal()
    try:
        if db.query(models.Form).count() == 0:
            logger.info("Seeding default data...")
            from app.seed import seed as _seed
            _seed(db)
    finally:
        db.close()
