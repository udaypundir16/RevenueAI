import os
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from models.health import HealthCheckResponse
from db.connection import get_db, is_supabase_configured, engine, SUPABASE_URL
from agents.recovery_agent import recovery_agent

router = APIRouter(tags=["System Health"])

@router.get("/health", response_model=HealthCheckResponse)
@router.get("/api/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """Returns the operational status of the Revenue Recovery AI backend."""
    razorpay_configured = bool(
        os.getenv("RAZORPAY_KEY_ID")
        and not os.getenv("RAZORPAY_KEY_ID", "").startswith("rzp_test_placeholder")
    )

    return HealthCheckResponse(
        status="healthy",
        service="revenue-recovery-ai-backend",
        version="0.1.0",
        timestamp=datetime.utcnow(),
        environment=os.getenv("ENVIRONMENT", "development"),
        features={
            "razorpay_configured": razorpay_configured,
            "supabase_configured": is_supabase_configured(),
            "gemini_agent_configured": recovery_agent.is_configured(),
        }
    )

@router.get("/api/health/db")
def test_db_connection(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Executes a live test query (SELECT 1) against the database."""
    try:
        query_result = db.execute(text("SELECT 1 AS alive")).scalar()
        dialect = engine.dialect.name
        
        info = {
            "status": "connected",
            "test_query": "SELECT 1 AS alive",
            "result": query_result,
            "dialect": dialect,
            "supabase_configured": is_supabase_configured(),
            "supabase_url": SUPABASE_URL if SUPABASE_URL else None,
        }
        
        if dialect == "postgresql":
            db_info = db.execute(text("SELECT current_database(), current_user, version();")).fetchone()
            info["postgresql"] = {
                "database": db_info[0],
                "user": db_info[1],
                "version": db_info[2].split()[0] + " " + db_info[2].split()[1],
            }
            
        return info
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "supabase_configured": is_supabase_configured(),
        }
