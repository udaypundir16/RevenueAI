import os
import hmac
import hashlib
import json
import logging
from decimal import Decimal
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException, Header, Depends, status
from sqlalchemy.orm import Session
from dotenv import dotenv_values

from db.connection import get_db
from models.db_models import Customer, Transaction

logger = logging.getLogger("revenue-recovery-ai.webhooks")

router = APIRouter(tags=["Razorpay Webhooks & Simulation"])

def get_webhook_secret() -> Optional[str]:
    """Retrieves current secret from .env file or os.environ."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        values = dotenv_values(env_file)
        if "RAZORPAY_WEBHOOK_SECRET" in values:
            file_secret = values.get("RAZORPAY_WEBHOOK_SECRET")
            return file_secret.strip() if file_secret else None

    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    return secret.strip() if secret else None

def verify_razorpay_signature(raw_body: bytes, signature: Optional[str], secret: Optional[str]) -> bool:
    """
    Validates the X-Razorpay-Signature HMAC SHA256 header per Razorpay documentation.
    Bypasses signature verification only when RAZORPAY_WEBHOOK_SECRET is left blank for dev.
    """
    if not secret or secret.startswith("placeholder"):
        print("\n" + "!" * 78)
        print("⚠️  [NOTICE] RAZORPAY_WEBHOOK_SECRET is blank/unset in .env.")
        print("   Signature verification is BYPASSED for development/demo testing.")
        print("!" * 78 + "\n")
        return True

    if not signature:
        logger.error("Missing X-Razorpay-Signature header in incoming request.")
        return False

    expected_signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    is_valid = hmac.compare_digest(expected_signature, signature)
    if not is_valid:
        logger.warning(
            f"Webhook signature mismatch! Received: {signature[:12]}... Expected: {expected_signature[:12]}..."
        )
    return is_valid

def print_demo_console_log(
    event_type: str,
    payment_id: str,
    amount: Decimal,
    currency: str,
    customer_email: str,
    failure_reason: str,
    action_taken: str,
    is_simulation: bool = False
):
    """Outputs a visually distinctive banner in the terminal for hackathon demo tracking."""
    banner_title = "🧪 SIMULATED PAYMENT FAILURE" if is_simulation else "🔔 RAZORPAY WEBHOOK EVENT RECEIVED"
    print("\n" + "=" * 80)
    print(f" {banner_title}")
    print("=" * 80)
    print(f" • Event:          {event_type}")
    print(f" • Payment ID:     {payment_id}")
    print(f" • Amount:         {currency} {amount:,.2f}")
    print(f" • Customer Email: {customer_email}")
    print(f" • Failure Reason: {failure_reason}")
    print(f" • DB Status:      status='failed' | {action_taken}")
    print("=" * 80 + "\n")

def process_and_persist_failure(
    payload: Dict[str, Any],
    db: Session,
    is_simulation: bool = False
) -> Dict[str, Any]:
    """
    Parses payment.failed or subscription.charged.failed payloads
    and inserts/updates the transaction with status='failed'.
    """
    event_type = payload.get("event", "payment.failed")
    event_payload = payload.get("payload", {})
    
    payment_entity = event_payload.get("payment", {}).get("entity", {})
    subscription_entity = event_payload.get("subscription", {}).get("entity", {})

    # Extract payment ID and details
    if payment_entity:
        payment_id = payment_entity.get("id") or f"pay_mock_{int(datetime.utcnow().timestamp())}"
        raw_amount = payment_entity.get("amount", 0)
        currency = payment_entity.get("currency", "INR")
        contact_email = payment_entity.get("email") or f"customer_{payment_id}@example.com"
        contact_phone = payment_entity.get("contact")
        customer_name = (
            payment_entity.get("notes", {}).get("customer_name")
            or payment_entity.get("name")
            or "Customer"
        )
        error_code = payment_entity.get("error_code") or "PAYMENT_FAILED"
        error_desc = payment_entity.get("error_description") or "Payment authorization declined"
        error_reason = payment_entity.get("error_reason") or "generic_decline"
        
        # Format failure_reason_raw = the error code/description from Razorpay
        failure_reason_raw = f"{error_code}: {error_desc}"
        if error_reason and error_reason not in failure_reason_raw:
            failure_reason_raw += f" (reason: {error_reason})"

    elif subscription_entity:
        sub_id = subscription_entity.get("id", "sub_unknown")
        payment_id = f"pay_sub_{sub_id}_{int(datetime.utcnow().timestamp())}"
        raw_amount = subscription_entity.get("plan", {}).get("item", {}).get("amount", 0) or 0
        currency = subscription_entity.get("plan", {}).get("item", {}).get("currency", "INR") or "INR"
        contact_email = subscription_entity.get("customer_email") or f"subscriber_{sub_id}@example.com"
        contact_phone = subscription_entity.get("customer_contact")
        customer_name = "Subscription Customer"
        error_code = "SUBSCRIPTION_CHARGE_FAILED"
        error_desc = "Scheduled recurring subscription charge failed"
        error_reason = "subscription_charge_failed"
        failure_reason_raw = f"{error_code}: {error_desc}"

    else:
        # Fallback for generic mock failure
        payment_id = f"pay_sim_{int(datetime.utcnow().timestamp())}"
        raw_amount = payload.get("amount", 250000)
        currency = payload.get("currency", "INR")
        contact_email = payload.get("email", "demo.user@example.com")
        contact_phone = payload.get("contact", "+919876543210")
        customer_name = payload.get("customer_name", "Demo Customer")
        error_code = payload.get("error_code", "BAD_REQUEST_ERROR")
        error_desc = payload.get("error_description", "Card was declined due to insufficient funds")
        error_reason = payload.get("error_reason", "insufficient_funds")
        failure_reason_raw = f"{error_code}: {error_desc}"

    # Calculate decimal amount (Razorpay amounts are in smallest currency units, e.g. paise)
    amount = Decimal(raw_amount) / Decimal(100) if raw_amount > 1000 else Decimal(raw_amount)

    # 1. Upsert Customer in database
    customer = db.query(Customer).filter(Customer.email == contact_email).first()
    if not customer:
        customer = Customer(
            name=customer_name,
            email=contact_email,
            phone=contact_phone,
            segment="b2c",
            risk_flag=True,
        )
        db.add(customer)
        db.flush()
    else:
        customer.risk_flag = True

    # 2. Upsert Transaction with status='failed'
    transaction = db.query(Transaction).filter(Transaction.razorpay_payment_id == payment_id).first()
    action_type = "Updated existing record"
    if not transaction:
        action_type = "Inserted new transaction"
        transaction = Transaction(
            razorpay_payment_id=payment_id,
            customer_id=customer.id,
            amount=amount,
            currency=currency,
            status="failed",
            failure_reason_raw=failure_reason_raw,
            failure_reason_classified=error_reason or "payment_failed",
            confidence_score=Decimal("0.8500"),
        )
        db.add(transaction)
    else:
        transaction.status = "failed"
        transaction.failure_reason_raw = failure_reason_raw
        transaction.failure_reason_classified = error_reason or transaction.failure_reason_classified

    db.commit()
    db.refresh(transaction)

    # 3. Synchronize with remote Supabase
    supabase_synced = False
    supabase_record_id = None
    try:
        from db.connection import get_supabase_client, is_supabase_configured
        if is_supabase_configured():
            supabase = get_supabase_client()
            if supabase:
                # Upsert customer in Supabase
                sb_cust = supabase.table("customers").upsert({
                    "name": customer_name,
                    "email": contact_email,
                    "phone": contact_phone,
                    "segment": "b2c",
                    "risk_flag": True
                }, on_conflict="email").execute()
                sb_cust_id = sb_cust.data[0]["id"] if sb_cust.data else str(customer.id)

                # Upsert transaction in Supabase
                sb_tx = supabase.table("transactions").upsert({
                    "razorpay_payment_id": payment_id,
                    "customer_id": sb_cust_id,
                    "amount": float(amount),
                    "currency": currency,
                    "status": "failed",
                    "failure_reason_raw": failure_reason_raw,
                    "failure_reason_classified": error_reason or "payment_failed",
                    "confidence_score": 0.8500
                }, on_conflict="razorpay_payment_id").execute()
                if sb_tx.data:
                    supabase_synced = True
                    supabase_record_id = sb_tx.data[0]["id"]
    except Exception as sb_err:
        logger.warning(f"Supabase sync note: {sb_err}")

    # 4. Print styled console log for the demo
    print_demo_console_log(
        event_type=event_type,
        payment_id=payment_id,
        amount=amount,
        currency=currency,
        customer_email=contact_email,
        failure_reason=failure_reason_raw,
        action_taken=f"{action_type} (id: {transaction.id})" + (f" | Supabase ID: {supabase_record_id}" if supabase_synced else ""),
        is_simulation=is_simulation
    )

    return {
        "status": "success",
        "event": event_type,
        "payment_id": payment_id,
        "transaction_id": str(transaction.id),
        "supabase_id": supabase_record_id,
        "supabase_synced": supabase_synced,
        "customer_id": str(customer.id),
        "amount": float(amount),
        "currency": currency,
        "transaction_status": "failed",
        "failure_reason_raw": failure_reason_raw,
        "is_simulation": is_simulation,
    }

# ============================================================================
# Webhook Receiver Routes
# ============================================================================

@router.post("/webhooks/razorpay", status_code=status.HTTP_200_OK)
@router.post("/api/webhooks/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook_receiver(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Main Razorpay Webhook Receiver.
    - Validates signature with RAZORPAY_WEBHOOK_SECRET (HMAC SHA256)
    - Parses payment.failed and subscription.charged.failed
    - Inserts/updates transaction row with status='failed'
    """
    raw_body = await request.body()
    secret = get_webhook_secret()

    # 1. Verify Signature
    if not verify_razorpay_signature(raw_body, x_razorpay_signature, secret):
        logger.error("Invalid Razorpay webhook signature.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    # 2. Parse Payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON body: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON payload"
        )

    event_type = payload.get("event", "unknown")

    # 3. Handle targeted failure events
    if event_type in ["payment.failed", "subscription.charged.failed"]:
        return process_and_persist_failure(payload=payload, db=db, is_simulation=False)
    
    # Handle other events (e.g. payment.captured, payment.authorized) gracefully
    logger.info(f"Acknowledged webhook event: {event_type}")
    return {
        "status": "acknowledged",
        "event": event_type,
        "message": f"Event '{event_type}' received."
    }

# ============================================================================
# Simulation Endpoint for Hackathon Demo
# ============================================================================

@router.post("/simulate/failure", status_code=status.HTTP_200_OK)
@router.post("/api/simulate/failure", status_code=status.HTTP_200_OK)
async def simulate_payment_failure(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Simulates a payment.failed event for demonstration purposes.
    Accepts an optional custom Razorpay-shaped payload or uses a realistic default.
    Bypasses HMAC signature check.
    """
    raw_body = await request.body()
    payload = {}

    if raw_body:
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            payload = {}

    # If payload is empty or not full Razorpay format, generate realistic mock
    if not payload.get("payload"):
        default_payment_id = payload.get("id") or f"pay_demo_{int(datetime.utcnow().timestamp())}"
        payload = {
            "entity": "event",
            "account_id": "acc_demo_hackathon",
            "event": payload.get("event") or "payment.failed",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": default_payment_id,
                        "amount": payload.get("amount", 349900), # INR 3,499.00
                        "currency": payload.get("currency", "INR"),
                        "status": "failed",
                        "method": payload.get("method", "card"),
                        "description": "Monthly Pro Subscription Failure",
                        "error_code": payload.get("error_code", "BAD_REQUEST_ERROR"),
                        "error_description": payload.get(
                            "error_description",
                            "Payment failed due to temporary card issuer decline"
                        ),
                        "error_source": "customer",
                        "error_step": "payment_authorization",
                        "error_reason": payload.get("error_reason", "insufficient_funds"),
                        "email": payload.get("email", "john.developer@example.com"),
                        "contact": payload.get("contact", "+919876543210"),
                        "notes": {
                            "customer_name": payload.get("customer_name", "John Developer")
                        }
                    }
                }
            },
            "created_at": int(datetime.utcnow().timestamp())
        }

    return process_and_persist_failure(payload=payload, db=db, is_simulation=True)
