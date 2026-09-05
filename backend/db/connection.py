import os
import logging
from pathlib import Path
from typing import Generator, Optional
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Load environment variables if not already loaded
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("revenue-recovery-ai.db")

# Read Supabase environment variables
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_KEY: Optional[str] = (
    os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)

DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

def is_supabase_configured() -> bool:
    """Returns True only if both SUPABASE_URL and a key are provided and not placeholders."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    if "your-project-id" in SUPABASE_URL or SUPABASE_KEY.startswith("placeholder"):
        return False
    return True

# Supabase Client initialisation
_supabase_client = None

def get_supabase_client():
    """Initializes and returns the official Supabase Python client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not is_supabase_configured():
        logger.warning(
            "SUPABASE_URL or SUPABASE_KEY is blank or unconfigured. "
            "Please set valid Supabase credentials in .env"
        )
        return None

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client successfully initialized.")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

# ============================================================================
# SQLAlchemy Database Connection Setup
# ============================================================================

def get_database_url() -> str:
    """
    Resolves the SQLAlchemy connection string.
    1. Uses explicit DATABASE_URL if configured (e.g. Supabase direct Postgres or connection pooler).
    2. Falls back to a local SQLite database for local offline development when credentials are blank.
    """
    if DATABASE_URL and DATABASE_URL.strip():
        url = DATABASE_URL.strip()
        # SQLAlchemy requires postgresql:// instead of postgres://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    # Graceful fallback for local development when credentials are not yet entered
    local_db_path = Path(__file__).resolve().parent.parent / "revenue_recovery.db"
    logger.info(
        "DATABASE_URL not set in .env. Using local SQLite development fallback: %s",
        local_db_path,
    )
    return f"sqlite:///{local_db_path}"

db_url = get_database_url()

# Configure SQLAlchemy engine
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    Automatically closes the session on exit.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes schema tables if using SQLite or direct ORM create."""
    from models.db_models import Base
    logger.info("Initializing database tables via SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
