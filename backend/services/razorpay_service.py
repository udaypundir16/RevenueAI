import os
import base64
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

from db.connection import dotenv_values
from pathlib import Path

logger = logging.getLogger("revenue-recovery-ai.razorpay-service")

def get_razorpay_credentials():
    """Reads current Razorpay credentials from .env or os.environ."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    key_id = None
    key_secret = None
    if env_file.exists():
        vals = dotenv_values(env_file)
        key_id = vals.get("RAZORPAY_KEY_ID")
        key_secret = vals.get("RAZORPAY_KEY_SECRET")

    if not key_id:
        key_id = os.getenv("RAZORPAY_KEY_ID")
    if not key_secret:
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    return (key_id.strip() if key_id else None), (key_secret.strip() if key_secret else None)

def is_razorpay_configured() -> bool:
    key_id, key_secret = get_razorpay_credentials()
    if not key_id or not key_secret:
        return False
    if key_id.startswith("placeholder") or key_secret.startswith("placeholder"):
        return False
    return True

class RazorpayRetryService:
    """Service to execute payment retries and recreate failed orders with Razorpay."""

    def __init__(self):
        self.base_url = "https://api.razorpay.com/v1"

    async def execute_retry(
        self,
        transaction: Any,
        attempt_number: int
    ) -> Dict[str, Any]:
        """
        Executes a retry against Razorpay by recreating an order or triggering payment link.
        If live credentials are not set, runs a realistic simulation.
        """
        key_id, key_secret = get_razorpay_credentials()
        amount_decimal = getattr(transaction, "amount", 0)
        currency = getattr(transaction, "currency", "INR")
        payment_id = getattr(transaction, "razorpay_payment_id", "unknown")

        # Amount in paise
        amount_paise = int(amount_decimal * 100)

        if not is_razorpay_configured():
            # Simulated retry execution
            logger.info(
                f"[SIMULATED RETRY] Executing retry #{attempt_number} for transaction {transaction.id} "
                f"({currency} {amount_decimal}) via smart retry pipeline."
            )
            # Higher recovery success probability on retry
            is_success = attempt_number <= 2
            return {
                "success": is_success,
                "order_id": f"order_retry_{payment_id}_{attempt_number}",
                "simulated": True,
                "message": (
                    "Retry payment captured successfully via smart retry pipeline."
                    if is_success
                    else "Issuer re-declined transaction on retry attempt."
                ),
                "amount": float(amount_decimal),
                "currency": currency,
            }

        # Live Razorpay API Call
        auth_header = base64.b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("utf-8")
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/json"
        }

        order_payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": f"retry_{transaction.id[:8]}_{attempt_number}",
            "notes": {
                "original_payment_id": payment_id,
                "retry_attempt": str(attempt_number),
                "agent": "revenue_recovery_orchestrator"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/orders",
                    json=order_payload,
                    headers=headers
                )
                if res.status_code in [200, 201]:
                    data = res.json()
                    return {
                        "success": True,
                        "order_id": data.get("id"),
                        "simulated": False,
                        "response": data,
                        "message": f"Successfully recreated order {data.get('id')} for recovery retry."
                    }
                else:
                    return {
                        "success": False,
                        "simulated": False,
                        "error": res.text,
                        "status_code": res.status_code,
                        "message": f"Razorpay order recreation failed with status {res.status_code}"
                    }
        except Exception as e:
            logger.error(f"Error communicating with Razorpay API during retry: {e}")
            return {
                "success": False,
                "simulated": False,
                "error": str(e),
                "message": f"Network exception during Razorpay retry: {e}"
            }

razorpay_retry_service = RazorpayRetryService()
