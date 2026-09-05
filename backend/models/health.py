from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class HealthCheckResponse(BaseModel):
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="revenue-recovery-ai-backend", description="Microservice identifier")
    version: str = Field(default="0.1.0", description="Backend service version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the check")
    environment: str = Field(default="development", description="Current operating environment")
    features: Dict[str, bool] = Field(
        default_factory=lambda: {
            "razorpay_configured": False,
            "supabase_configured": False,
            "gemini_agent_configured": False,
        },
        description="Feature flag and integration status summary"
    )
