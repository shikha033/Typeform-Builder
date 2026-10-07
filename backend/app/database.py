"""Database configuration and session management."""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./typeform.db")

# SQLite needs special connect args for multithreading
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to acquire a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and run lightweight SQLite ADD COLUMN migrations."""
    from app import models  # noqa: F401 - ensure models are imported
    Base.metadata.create_all(bind=engine)

    # Lightweight migration: add new columns on existing SQLite tables if missing.
    migrations = [
        ("forms", "theme", "JSON"),
        ("questions", "logic_jumps", "JSON"),
    ]
    with engine.begin() as conn:
        for table, column, coltype in migrations:
            # SQLite stores JSON as TEXT; use TEXT for compatibility
            sql_type = "TEXT" if coltype == "JSON" else coltype
            try:
                cols = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
                existing = {row[1] for row in cols}
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}")
            except Exception:
                pass
