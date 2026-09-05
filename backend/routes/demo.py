import asyncio
import time
import random
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.connection import get_db
from routes.webhooks import process_and_persist_failure
from scripts.simulate_demo import DEMO_SCENARIOS

router = APIRouter(prefix="/api/demo", tags=["Demo Simulation Stream"])

class DemoRunRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=20, description="Number of failure events to simulate")
    interval: float = Field(default=0.3, ge=0.0, le=5.0, description="Delay between events in seconds")

@router.get("/scenarios")
def list_demo_scenarios() -> Dict[str, Any]:
    """Returns the catalog of available payment failure scenarios for demo simulations."""
    return {
        "count": len(DEMO_SCENARIOS),
        "scenarios": DEMO_SCENARIOS
    }

@router.post("/run")
@router.post("/simulate-stream")
async def run_demo_simulation_stream(
    req: DemoRunRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Executes a stream of N realistic payment failure events.
    For each event:
    1. Ingests simulated Razorpay webhook payload
    2. Upserts customer with segment (B2B / B2C)
    3. Triggers AI classification
    4. Evaluates autonomous Orchestrator Agent decision & records auditable reasoning
    5. Dispatches Gemini adaptive dunning message OR schedules retry attempts
    6. Returns real-time step-by-step telemetry for frontend live display.
    """
    results: List[Dict[str, Any]] = []
    action_counts = {
        "retry_later": 0,
        "notify_customer": 0,
        "retry_now": 0,
        "escalate": 0,
        "other": 0
    }
    total_amount_inr = Decimal("0.00")

    pool = list(DEMO_SCENARIOS)
    random.shuffle(pool)

    for i in range(req.count):
        scenario = pool[i % len(pool)]
        unique_suffix = f"{int(time.time()*1000) % 1000000}_{uuid4().hex[:4]}"
        payment_id = f"pay_demo_{unique_suffix}"
        
        raw_amount = scenario["amount"]
        amount_inr = Decimal(raw_amount) / Decimal(100)
        total_amount_inr += amount_inr

        payload = {
            "entity": "event",
            "account_id": "acc_demo_hackathon",
            "event": "payment.failed",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "amount": raw_amount,
                        "currency": "INR",
                        "status": "failed",
                        "method": "card",
                        "description": f"Demo Subscription - {scenario['customer_name']}",
                        "error_code": scenario["error_code"],
                        "error_description": scenario["error_description"],
                        "error_source": "customer",
                        "error_step": "payment_authorization",
                        "error_reason": scenario["error_reason"],
                        "email": scenario["email"],
                        "contact": scenario.get("contact", "+919876543210"),
                        "notes": {
                            "customer_name": scenario["customer_name"],
                            "segment": scenario.get("segment", "b2c")
                        }
                    }
                }
            },
            "created_at": int(time.time())
        }

        try:
            res = process_and_persist_failure(payload=payload, db=db, is_simulation=True)
            orch = res.get("orchestration", {})
            decision = orch.get("decision", {})
            action = decision.get("action", "processed")
            reasoning = decision.get("reasoning", "")
            rec_msg = orch.get("recovery_message")
            retry_att = orch.get("retry_attempt")

            if action in action_counts:
                action_counts[action] += 1
            else:
                action_counts["other"] += 1

            results.append({
                "step": i + 1,
                "payment_id": payment_id,
                "transaction_id": res.get("transaction_id"),
                "customer": scenario["customer_name"],
                "email": scenario["email"],
                "segment": scenario.get("segment", "b2c").upper(),
                "amount": float(amount_inr),
                "currency": "INR",
                "failure_reason_raw": f"{scenario['error_code']}: {scenario['error_description']}",
                "failure_reason_classified": scenario["error_reason"],
                "action": action,
                "reasoning": reasoning,
                "has_message": bool(rec_msg),
                "dunning_content": rec_msg.get("rendered_content") if rec_msg else None,
                "retry_scheduled": bool(retry_att),
                "scheduled_time": decision.get("scheduled_time"),
                "status": "processed"
            })
        except Exception as e:
            results.append({
                "step": i + 1,
                "payment_id": payment_id,
                "customer": scenario["customer_name"],
                "status": "error",
                "error": str(e)
            })

        if i < req.count - 1 and req.interval > 0:
            await asyncio.sleep(req.interval)

    return {
        "status": "success",
        "total_simulated": len(results),
        "transactions": results,
        "summary": {
            "total_at_risk_added": float(total_amount_inr),
            "action_counts": action_counts
        }
    }
