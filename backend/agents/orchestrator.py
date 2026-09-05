import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from models.db_models import Transaction, Customer, RecoveryAction, RetryAttempt
from db.connection import get_supabase_client, is_supabase_configured

logger = logging.getLogger("revenue-recovery-ai.orchestrator")

def normalize_failure_classification(
    failure_reason_raw: Optional[str],
    classified_reason: Optional[str]
) -> str:
    """Normalizes raw and classified failure reasons into canonical strategy buckets."""
    raw = (failure_reason_raw or "").lower()
    classified = (classified_reason or "").lower()
    combined = f"{raw} {classified}"

    if any(k in combined for k in ["insufficient", "balance", "low_funds", "fund", "limit_exceeded"]):
        return "insufficient_funds"
    if any(k in combined for k in ["expired", "validity", "invalid_card", "lost_card", "stolen_card"]):
        return "expired_card"
    if any(k in combined for k in ["do_not_honor", "bank_decline", "issuer", "declined_by_bank", "mandate_revoked", "authorization"]):
        return "bank_decline"
    if any(k in combined for k in ["network", "timeout", "gateway", "unresponsive", "connection", "system_error", "server_error"]):
        return "network_error"
    if any(k in combined for k in ["risk", "fraud", "blacklisted", "security", "suspicious", "block"]):
        return "risk_block"

    return "unknown"

def decide_action(
    transaction: Any,
    customer: Optional[Any] = None,
    past_attempts: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates a failed transaction and determines the optimal recovery strategy.
    
    Rule-based strategy matrix:
    - insufficient_funds: retry_later in 2-3 days (48 hours)
    - expired_card / invalid_card: notify_customer (no auto-retry), ask for card update
    - bank_decline: retry_later in 6 hours (max 2 attempts), then notify_customer
    - network_error: retry_now (max 3 attempts within 1 hour)
    - risk_block: escalate (flag for manual review), no retry, no customer contact
    - unknown: notify_customer with generic courteous message
    
    Returns:
      {
        "action": str,                # 'retry_later' | 'retry_now' | 'notify_customer' | 'escalate'
        "db_action_type": str,        # 'retry' | 'notify' | 'escalate' | 'write_off'
        "scheduled_time": Optional[datetime],
        "reasoning": str,             # Plain-English explanation of why this decision was made
        "method": str,                # 'smart_retry_schedule' | 'immediate_network_retry' | etc.
        "classification": str,
        "attempt_count": int,
      }
    """
    past_attempts = past_attempts or []
    attempt_count = len(past_attempts)

    # Extract failure information
    failure_reason_raw = getattr(transaction, "failure_reason_raw", None)
    if isinstance(transaction, dict):
        failure_reason_raw = transaction.get("failure_reason_raw")
        classified_reason = transaction.get("failure_reason_classified")
        amount = transaction.get("amount", 0)
        currency = transaction.get("currency", "INR")
    else:
        classified_reason = getattr(transaction, "failure_reason_classified", None)
        amount = getattr(transaction, "amount", 0)
        currency = getattr(transaction, "currency", "INR")

    classification = normalize_failure_classification(failure_reason_raw, classified_reason)
    now_utc = datetime.now(timezone.utc)

    # ------------------------------------------------------------------------
    # 1. INSUFFICIENT FUNDS
    # ------------------------------------------------------------------------
    if classification == "insufficient_funds":
        # Schedule retry in 2-3 days (48 hours)
        scheduled_time = now_utc + timedelta(hours=48)
        return {
            "action": "retry_later",
            "db_action_type": "retry",
            "scheduled_time": scheduled_time,
            "method": "card_smart_schedule_retry",
            "classification": classification,
            "attempt_count": attempt_count + 1,
            "reasoning": (
                f"Customer account experienced insufficient funds for {currency} {amount:,.2f}. "
                "Automated smart recovery has scheduled a retry in 48 hours to align with typical payroll "
                "and account re-funding cycles, maximizing recovery probability without triggering account fatigue."
            )
        }

    # ------------------------------------------------------------------------
    # 2. EXPIRED / INVALID CARD
    # ------------------------------------------------------------------------
    elif classification == "expired_card":
        # Notify customer immediately to update payment details, no auto retry
        return {
            "action": "notify_customer",
            "db_action_type": "notify",
            "scheduled_time": None,
            "method": "card_update_notification",
            "classification": classification,
            "attempt_count": attempt_count,
            "reasoning": (
                "The customer payment method has expired or is invalid. Automated retries against this card "
                "are guaranteed to fail and may result in gateway penalties. Prompting customer via high-priority "
                "notification with a secure self-service link to update their card details."
            )
        }

    # ------------------------------------------------------------------------
    # 3. BANK DECLINE / ISSUER DECLINE
    # ------------------------------------------------------------------------
    elif classification == "bank_decline":
        MAX_BANK_DECLINE_ATTEMPTS = 2
        if attempt_count < MAX_BANK_DECLINE_ATTEMPTS:
            scheduled_time = now_utc + timedelta(hours=6)
            return {
                "action": "retry_later",
                "db_action_type": "retry",
                "scheduled_time": scheduled_time,
                "method": "bank_cooling_period_retry",
                "classification": classification,
                "attempt_count": attempt_count + 1,
                "reasoning": (
                    f"Bank authorization declined (Attempt {attempt_count + 1} of {MAX_BANK_DECLINE_ATTEMPTS}). "
                    "Temporary issuer blocks and rate-limits frequently clear within a few hours. "
                    "Scheduled a retry in 6 hours during bank operational hours."
                )
            }
        else:
            return {
                "action": "notify_customer",
                "db_action_type": "notify",
                "scheduled_time": None,
                "method": "customer_bank_assistance_request",
                "classification": classification,
                "attempt_count": attempt_count,
                "reasoning": (
                    f"Bank decline persisted after {MAX_BANK_DECLINE_ATTEMPTS} automated retry attempts. "
                    "Further retries will likely be rejected. Notifying customer to contact their issuing bank "
                    "or authorize online recurring merchant debits."
                )
            }

    # ------------------------------------------------------------------------
    # 4. NETWORK ERROR / GATEWAY TIMEOUT
    # ------------------------------------------------------------------------
    elif classification == "network_error":
        MAX_NETWORK_ATTEMPTS = 3
        if attempt_count < MAX_NETWORK_ATTEMPTS:
            # Immediate or fast retry within 15-20 minutes
            delay_minutes = 15 if attempt_count > 0 else 5
            scheduled_time = now_utc + timedelta(minutes=delay_minutes)
            return {
                "action": "retry_now",
                "db_action_type": "retry",
                "scheduled_time": scheduled_time,
                "method": "transient_network_retry",
                "classification": classification,
                "attempt_count": attempt_count + 1,
                "reasoning": (
                    f"Transient network/gateway connectivity issue detected (Attempt {attempt_count + 1} of {MAX_NETWORK_ATTEMPTS}). "
                    f"The failure was non-financial. Immediate retry scheduled in {delay_minutes} minutes "
                    "via alternate payment routing to recover transaction."
                )
            }
        else:
            return {
                "action": "notify_customer",
                "db_action_type": "notify",
                "scheduled_time": None,
                "method": "gateway_incident_notification",
                "classification": classification,
                "attempt_count": attempt_count,
                "reasoning": (
                    f"Network/gateway timeouts persisted through {MAX_NETWORK_ATTEMPTS} attempts. "
                    "Halting automated retries and notifying customer of gateway outage with an alternative payment link."
                )
            }

    # ------------------------------------------------------------------------
    # 5. RISK BLOCK / FRAUD PREVENTION
    # ------------------------------------------------------------------------
    elif classification == "risk_block":
        return {
            "action": "escalate",
            "db_action_type": "escalate",
            "scheduled_time": None,
            "method": "manual_risk_review",
            "classification": classification,
            "attempt_count": attempt_count,
            "reasoning": (
                "Transaction was flagged by risk/fraud protection rules. Under security protocol, "
                "automated retries and direct customer dunning notifications are prohibited. "
                "Escalating transaction to compliance & merchant risk operations for manual verification."
            )
        }

    # ------------------------------------------------------------------------
    # 6. UNKNOWN / GENERIC DECLINE
    # ------------------------------------------------------------------------
    else:
        return {
            "action": "notify_customer",
            "db_action_type": "notify",
            "scheduled_time": None,
            "method": "generic_payment_notice",
            "classification": "unknown",
            "attempt_count": attempt_count,
            "reasoning": (
                "Payment was declined with an unclassified or non-specific gateway code. "
                "Sending courteous notification to customer with diagnostic details and a secure direct checkout link."
            )
        }

def record_orchestrator_decision(
    transaction_id: Any,
    decision: Dict[str, Any],
    db: Session,
    customer_id: Optional[Any] = None,
    supabase_transaction_id: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Persists the orchestrator decision into recovery_actions and (if retrying) retry_attempts.
    Synchronizes records with live remote Supabase.
    """
    action_type = decision.get("db_action_type", "retry")
    reasoning = decision.get("reasoning", "Autonomous recovery action determined.")
    scheduled_time = decision.get("scheduled_time")
    attempt_count = decision.get("attempt_count", 1)
    method = decision.get("method", "smart_recovery")

    # 1. Save to SQLAlchemy recovery_actions
    recovery_action = RecoveryAction(
        transaction_id=transaction_id,
        action_type=action_type,
        agent_reasoning=reasoning
    )
    db.add(recovery_action)
    db.flush()

    retry_attempt_record = None
    if decision.get("action") in ["retry_later", "retry_now"] and scheduled_time:
        retry_attempt_record = RetryAttempt(
            transaction_id=transaction_id,
            attempt_number=attempt_count,
            scheduled_at=scheduled_time,
            outcome="pending",
            method=method,
        )
        db.add(retry_attempt_record)
        db.flush()

    db.commit()
    db.refresh(recovery_action)
    if retry_attempt_record:
        db.refresh(retry_attempt_record)

    # 2. Remote Supabase Synchronization
    sb_action_id = None
    sb_retry_id = None
    try:
        if is_supabase_configured():
            supabase = get_supabase_client()
            if supabase:
                # Find matching Supabase transaction ID if not explicitly provided
                remote_tx_id = supabase_transaction_id
                if not remote_tx_id and razorpay_payment_id:
                    sb_lookup = supabase.table("transactions").select("id").eq("razorpay_payment_id", razorpay_payment_id).limit(1).execute()
                    if sb_lookup.data:
                        remote_tx_id = sb_lookup.data[0]["id"]
                if not remote_tx_id:
                    remote_tx_id = str(transaction_id)

                # Upsert into recovery_actions in Supabase
                res_action = supabase.table("recovery_actions").insert({
                    "transaction_id": remote_tx_id,
                    "action_type": action_type,
                    "agent_reasoning": reasoning
                }).execute()
                if res_action.data:
                    sb_action_id = res_action.data[0]["id"]

                # If scheduled retry, insert into retry_attempts in Supabase
                if retry_attempt_record:
                    res_retry = supabase.table("retry_attempts").insert({
                        "transaction_id": remote_tx_id,
                        "attempt_number": attempt_count,
                        "scheduled_at": scheduled_time.isoformat(),
                        "outcome": "pending",
                        "method": method
                    }).execute()
                    if res_retry.data:
                        sb_retry_id = res_retry.data[0]["id"]
    except Exception as sb_err:
        logger.warning(f"Supabase orchestrator sync warning: {sb_err}")

    # 3. If action is notify_customer, automatically generate and dispatch recovery message
    msg_dispatch_result = None
    if decision.get("action") == "notify_customer":
        try:
            from agents.messenger import generate_recovery_message, send_message
            tx_obj = db.query(Transaction).filter(Transaction.id == transaction_id).first()
            cust_obj = None
            if customer_id:
                cust_obj = db.query(Customer).filter(Customer.id == customer_id).first()
            elif tx_obj and tx_obj.customer_id:
                cust_obj = db.query(Customer).filter(Customer.id == tx_obj.customer_id).first()

            if tx_obj and cust_obj:
                msg_content = generate_recovery_message(
                    customer=cust_obj,
                    transaction=tx_obj,
                    reason=decision.get("classification") or tx_obj.failure_reason_raw
                )
                msg_dispatch_result = send_message(
                    channel="email",
                    content=msg_content,
                    customer=cust_obj,
                    transaction=tx_obj,
                    db=db,
                    supabase_tx_id=remote_tx_id if ('remote_tx_id' in locals() and remote_tx_id) else supabase_transaction_id
                )
        except Exception as msg_err:
            logger.error(f"Automatic messenger notification failed: {msg_err}")

    # Output transparency notice in console (ASCII safe for all terminal encodings)
    try:
        print("\n" + "-" * 80)
        print(" [ORCHESTRATOR] RECOVERY AGENT DECISION")
        print("-" * 80)
        print(f" - Action:         {decision.get('action', '').upper()} (DB Action: {action_type})")
        print(f" - Scheduled Time: {scheduled_time.isoformat() if scheduled_time else 'None (Immediate Notification/Escalation)'}")
        print(f" - Reasoning:      {reasoning}")
        print(f" - Action ID:      {recovery_action.id} (Supabase: {sb_action_id or 'Local'})")
        if retry_attempt_record:
            print(f" - Retry ID:       {retry_attempt_record.id} (Supabase: {sb_retry_id or 'Local'})")
        if msg_dispatch_result:
            print(f" - Notification:   Dispatched ({msg_dispatch_result.get('status', 'mocked').upper()}) to {msg_dispatch_result.get('customer_email')}")
        print("-" * 80 + "\n")
    except Exception:
        pass

    return {
        "recovery_action_id": str(recovery_action.id),
        "supabase_action_id": sb_action_id,
        "retry_attempt_id": str(retry_attempt_record.id) if retry_attempt_record else None,
        "supabase_retry_id": sb_retry_id,
        "decision": decision,
        "recovery_message": msg_dispatch_result
    }
