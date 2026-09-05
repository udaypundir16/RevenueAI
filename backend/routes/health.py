import os
from datetime import datetime
from fastapi import APIRouter
from models.health import HealthCheckResponse
from db.session import db_manager
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
            "supabase_configured": db_manager.is_configured(),
            "gemini_agent_configured": recovery_agent.is_configured(),
        }
    )
