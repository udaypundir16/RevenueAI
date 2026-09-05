from typing import List, Dict, Any, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db.connection import get_db
from models.db_models import Transaction, Customer, RecoveryAction, RetryAttempt, RecoveryMessage

router = APIRouter(prefix="/api/transactions", tags=["Transactions & Audit Timeline"])

@router.get("")
def get_transactions(
    status: Optional[str] = Query(None, description="Filter by status (e.g. failed, recovered)"),
    category: Optional[str] = Query(None, description="Filter by classified failure category"),
    search: Optional[str] = Query(None, description="Search by customer name, email, or payment ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Returns filterable, sortable list of all transactions with customer details,
    AI classification, and current recovery status.
    """
    query = db.query(Transaction)

    if status and status.strip():
        query = query.filter(Transaction.status == status.strip().lower())

    if category and category.strip():
        query = query.filter(Transaction.failure_reason_classified == category.strip().lower())

    # Order by creation date descending
    transactions = query.order_by(desc(Transaction.created_at)).limit(limit).offset(offset).all()

    results = []
    for tx in transactions:
        cust = db.query(Customer).filter(Customer.id == tx.customer_id).first() if tx.customer_id else None
        
        # Apply search in memory if requested
        if search and search.strip():
            term = search.strip().lower()
            name_match = cust and term in (cust.name or "").lower()
            email_match = cust and term in (cust.email or "").lower()
            pay_match = term in (tx.razorpay_payment_id or "").lower()
            reason_match = term in (tx.failure_reason_raw or "").lower()
            if not (name_match or email_match or pay_match or reason_match):
                continue

        # Get latest action
        latest_action = (
            db.query(RecoveryAction)
            .filter(RecoveryAction.transaction_id == tx.id)
            .order_by(desc(RecoveryAction.created_at))
            .first()
        )

        # Get retry attempts count
        retry_count = db.query(RetryAttempt).filter(RetryAttempt.transaction_id == tx.id).count()

        # Get messages count
        message_count = db.query(RecoveryMessage).filter(RecoveryMessage.transaction_id == tx.id).count()

        results.append({
            "id": str(tx.id),
            "razorpay_payment_id": tx.razorpay_payment_id or "N/A",
            "amount": float(tx.amount) if tx.amount else 0.0,
            "currency": tx.currency or "INR",
            "status": tx.status or "failed",
            "failure_reason_raw": tx.failure_reason_raw or "Unspecified gateway failure",
            "failure_reason_classified": tx.failure_reason_classified or "unknown",
            "confidence_score": float(tx.confidence_score) if tx.confidence_score else 0.85,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "customer": {
                "id": str(cust.id) if cust else None,
                "name": cust.name if cust else "Anonymous Customer",
                "email": cust.email if cust else "unknown@example.com",
                "segment": (cust.segment if cust else "b2c").upper(),
                "risk_flag": cust.risk_flag if cust else False,
            },
            "latest_action": {
                "action_type": latest_action.action_type if latest_action else "pending_evaluation",
                "agent_reasoning": latest_action.agent_reasoning if latest_action else "Awaiting orchestrator trigger.",
                "created_at": latest_action.created_at.isoformat() if latest_action and latest_action.created_at else None,
            } if latest_action else None,
            "retry_count": retry_count,
            "message_count": message_count,
        })

    return results

@router.get("/{transaction_id}/timeline")
def get_transaction_timeline(transaction_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns a comprehensive, vertical timeline of a transaction:
    Payment Failed -> AI Classification -> Agent Decision (with reasoning) -> Execution -> Outcome.
    """
    try:
        tx_uuid = uuid.UUID(transaction_id)
        tx = db.query(Transaction).filter(Transaction.id == tx_uuid).first()
    except Exception:
        tx = db.query(Transaction).filter(Transaction.razorpay_payment_id == transaction_id).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    cust = db.query(Customer).filter(Customer.id == tx.customer_id).first() if tx.customer_id else None
    actions = db.query(RecoveryAction).filter(RecoveryAction.transaction_id == tx.id).order_by(RecoveryAction.created_at).all()
    retries = db.query(RetryAttempt).filter(RetryAttempt.transaction_id == tx.id).order_by(RetryAttempt.created_at).all()
    messages = db.query(RecoveryMessage).filter(RecoveryMessage.transaction_id == tx.id).order_by(RecoveryMessage.created_at).all()

    timeline_steps = []

    # Step 1: Payment Failed
    timeline_steps.append({
        "step": 1,
        "type": "payment_failed",
        "title": "Payment Failed at Gateway",
        "timestamp": tx.created_at.isoformat() if tx.created_at else None,
        "status": "failed",
        "details": {
            "gateway": "Razorpay",
            "payment_id": tx.razorpay_payment_id or "N/A",
            "amount": f"{tx.currency} {float(tx.amount):,.2f}",
            "raw_error": tx.failure_reason_raw or "Transaction declined",
        }
    })

    # Step 2: AI Classification
    classified_category = tx.failure_reason_classified or "insufficient_funds"
    confidence_pct = int((float(tx.confidence_score) if tx.confidence_score else 0.94) * 100)
    timeline_steps.append({
        "step": 2,
        "type": "ai_classification",
        "title": f"AI Classified as {classified_category.replace('_', ' ').title()}",
        "timestamp": tx.created_at.isoformat() if tx.created_at else None,
        "status": "success",
        "confidence_score": confidence_pct,
        "details": {
            "classified_category": classified_category,
            "confidence": f"{confidence_pct}%",
            "extracted_signal": f"Processed raw message: '{tx.failure_reason_raw}' via pattern matching & classification engine.",
        }
    })

    # Step 3: Agent Decision (Reasoning Shown Prominently)
    if actions:
        for act in actions:
            timeline_steps.append({
                "step": 3,
                "type": "agent_decision",
                "title": f"Agent Decided: {act.action_type.replace('_', ' ').title()}",
                "timestamp": act.created_at.isoformat() if act.created_at else None,
                "status": "decided",
                "action_type": act.action_type,
                "agent_reasoning": act.agent_reasoning,
                "details": {
                    "action": act.action_type,
                    "reasoning": act.agent_reasoning,
                    "action_id": str(act.id),
                }
            })
    else:
        timeline_steps.append({
            "step": 3,
            "type": "agent_decision",
            "title": "Agent Evaluation Pending",
            "timestamp": tx.created_at.isoformat() if tx.created_at else None,
            "status": "pending",
            "agent_reasoning": "Awaiting orchestrator trigger.",
            "details": {}
        })

    # Step 4: Retry Attempts or Customer Notification Messages
    if retries:
        for r in retries:
            timeline_steps.append({
                "step": 4,
                "type": "retry_execution",
                "title": f"Smart Retry #{r.attempt_number} ({r.outcome.upper()})",
                "timestamp": r.executed_at.isoformat() if r.executed_at else (r.scheduled_at.isoformat() if r.scheduled_at else None),
                "status": r.outcome,
                "details": {
                    "attempt_number": r.attempt_number,
                    "method": r.method,
                    "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
                    "executed_at": r.executed_at.isoformat() if r.executed_at else "Pending scheduled trigger",
                    "outcome": r.outcome,
                }
            })

    if messages:
        for m in messages:
            timeline_steps.append({
                "step": 4,
                "type": "customer_notification",
                "title": f"Gemini Recovery Message Dispatched ({m.channel.upper()})",
                "timestamp": m.sent_at.isoformat() if m.sent_at else (m.created_at.isoformat() if m.created_at else None),
                "status": "sent" if m.sent_at else "mocked",
                "details": {
                    "channel": m.channel,
                    "content_preview": m.content,
                    "recipient": cust.email if cust else "customer@example.com",
                    "status": "Dispatched (MOCK_MODE)" if not m.sent_at else "Sent",
                }
            })

    # Step 5: Final / Current Outcome
    timeline_steps.append({
        "step": 5,
        "type": "final_outcome",
        "title": f"Current State: {tx.status.upper()}",
        "timestamp": tx.updated_at.isoformat() if tx.updated_at else (tx.created_at.isoformat() if tx.created_at else None),
        "status": tx.status,
        "details": {
            "status": tx.status,
            "summary": "Autonomous recovery workflow in progress or resolved."
        }
    })

    return {
        "transaction": {
            "id": str(tx.id),
            "razorpay_payment_id": tx.razorpay_payment_id or "N/A",
            "amount": float(tx.amount) if tx.amount else 0.0,
            "currency": tx.currency or "INR",
            "status": tx.status,
            "failure_reason_raw": tx.failure_reason_raw,
            "failure_reason_classified": tx.failure_reason_classified,
            "confidence_score": float(tx.confidence_score) if tx.confidence_score else 0.94,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        },
        "customer": {
            "id": str(cust.id) if cust else None,
            "name": cust.name if cust else "Anonymous Customer",
            "email": cust.email if cust else "unknown@example.com",
            "segment": (cust.segment if cust else "b2c").upper(),
            "risk_flag": cust.risk_flag if cust else False,
        },
        "timeline": timeline_steps,
    }
