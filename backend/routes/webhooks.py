import os
import hmac
import hashlib
import json
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException, Header, Depends, status
from sqlalchemy.orm import Session
from db.connection import get_db
from models.db_models import Customer, Transaction

from pathlib import Path
from dotenv import dotenv_values

logger = logging.getLogger("revenue-recovery-ai.webhooks")

router = APIRouter(prefix="/api/webhooks", tags=["Razorpay Webhooks"])

def get_webhook_secret() -> Optional[str]:
    """Retrieves current secret from os.environ or directly from .env."""
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        values = dotenv_values(env_file)
        file_secret = values.get("RAZORPAY_WEBHOOK_SECRET")
        if file_secret:
            secret = file_secret
    return secret

def verify_razorpay_signature(raw_body: bytes, signature: Optional[str], secret: Optional[str]) -> bool:
    """Validates the X-Razorpay-Signature HMAC SHA256 header."""
    if not secret or secret.startswith("placeholder"):
        logger.warning("RAZORPAY_WEBHOOK_SECRET is unconfigured or placeholder. Skipping signature verification in dev mode.")
        return True

    if not signature:
        logger.error("Missing X-Razorpay-Signature header.")
        return False

    expected_signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)

@router.post("/razorpay", status_code=status.HTTP_200_OK)
@router.post("/razorpay/", status_code=status.HTTP_200_OK)
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Receives and processes incoming Razorpay webhooks.
    Endpoint URL to configure in Razorpay Dashboard:
      https://<your-ngrok-domain>/api/webhooks/razorpay
    """
    raw_body = await request.body()
    secret = get_webhook_secret()

    # 1. Signature Verification
    if not verify_razorpay_signature(raw_body, x_razorpay_signature, secret):
        logger.error("Invalid Razorpay webhook signature.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    # 2. Parse Event Payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON body: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON payload"
        )

    event_type = payload.get("event", "unknown")
    logger.info(f"Received Razorpay webhook event: {event_type}")

    # 3. Process Payment Events (e.g. payment.failed, payment.captured)
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    if not payment_entity:
        # Some events nest differently or represent test webhooks
        return {"status": "success", "event": event_type, "message": "Event acknowledged (no payment entity)"}

    payment_id = payment_entity.get("id")
    raw_amount = payment_entity.get("amount", 0) # Amount in smallest currency unit (paise)
    amount = Decimal(raw_amount) / Decimal(100) # Convert paise to INR
    currency = payment_entity.get("currency", "INR")
    contact_email = payment_entity.get("email") or f"unknown_{payment_id}@customer.com"
    contact_phone = payment_entity.get("contact")
    
    error_code = payment_entity.get("error_code")
    error_desc = payment_entity.get("error_description")
    error_reason = payment_entity.get("error_reason")
    raw_reason = f"{error_code}: {error_desc} ({error_reason})" if error_code else None

    logger.info(
        f"Processing payment {payment_id} | Amount: {currency} {amount} | Event: {event_type} | Reason: {raw_reason}"
    )

    try:
        # Upsert Customer
        customer = db.query(Customer).filter(Customer.email == contact_email).first()
        if not customer:
            customer = Customer(
                name=payment_entity.get("notes", {}).get("customer_name", "Customer"),
                email=contact_email,
                phone=contact_phone,
                segment="b2c",
                risk_flag=(event_type == "payment.failed"),
            )
            db.add(customer)
            db.flush()

        # Determine transaction status
        status_map = {
            "payment.failed": "failed",
            "payment.captured": "recovered",
            "payment.authorized": "retrying",
        }
        tx_status = status_map.get(event_type, "failed")

        # Upsert Transaction
        transaction = db.query(Transaction).filter(Transaction.razorpay_payment_id == payment_id).first()
        if not transaction:
            transaction = Transaction(
                razorpay_payment_id=payment_id,
                customer_id=customer.id,
                amount=amount,
                currency=currency,
                status=tx_status,
                failure_reason_raw=raw_reason,
                failure_reason_classified=error_reason or error_code or "unknown_failure",
                confidence_score=Decimal("0.8500") if tx_status == "failed" else None,
            )
            db.add(transaction)
        else:
            transaction.status = tx_status
            if raw_reason:
                transaction.failure_reason_raw = raw_reason
            if error_reason:
                transaction.failure_reason_classified = error_reason

        db.commit()
        logger.info(f"Successfully recorded transaction {payment_id} with status '{tx_status}' in database.")
    except Exception as db_err:
        db.rollback()
        logger.error(f"Error persisting webhook data to database: {db_err}")
        # Return 200 to Razorpay so it doesn't repeatedly retry failing webhooks while logging error
        return {
            "status": "warning",
            "event": event_type,
            "payment_id": payment_id,
            "db_error": str(db_err)
        }

    return {
        "status": "success",
        "event": event_type,
        "payment_id": payment_id,
        "recorded_status": tx_status
    }
