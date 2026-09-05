from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db.connection import get_db
from models.db_models import RecoveryAction, RetryAttempt, Transaction, RecoveryMessage, Customer
from services.scheduler import retry_scheduler

router = APIRouter(prefix="/api/recovery", tags=["Recovery Orchestration & Transparency"])

@router.get("/messages")
def get_recovery_messages(db: Session = Depends(get_db), limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns recent customer recovery notifications generated and dispatched by the Messenger Agent.
    """
    messages = db.query(RecoveryMessage).order_by(desc(RecoveryMessage.created_at)).limit(limit).all()
    results = []
    for m in messages:
        data = m.as_dict()
        tx = db.query(Transaction).filter(Transaction.id == m.transaction_id).first()
        if tx:
            data["payment_id"] = tx.razorpay_payment_id
            data["amount"] = float(tx.amount) if tx.amount else 0
            data["currency"] = tx.currency
            data["status"] = tx.status
            data["failure_reason_raw"] = tx.failure_reason_raw
            if tx.customer_id:
                cust = db.query(Customer).filter(Customer.id == tx.customer_id).first()
                if cust:
                    data["customer_name"] = cust.name
                    data["customer_email"] = cust.email
                    data["customer_segment"] = cust.segment
        results.append(data)
    return results

@router.get("/actions")
def get_recovery_actions(db: Session = Depends(get_db), limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns recent recovery agent decisions and plain-English reasoning
    to power the 'Agent Transparency' view in the dashboard.
    """
    actions = db.query(RecoveryAction).order_by(desc(RecoveryAction.created_at)).limit(limit).all()
    results = []
    for a in actions:
        data = a.as_dict()
        # Attach transaction info if available
        tx = db.query(Transaction).filter(Transaction.id == a.transaction_id).first()
        if tx:
            data["payment_id"] = tx.razorpay_payment_id
            data["amount"] = float(tx.amount) if tx.amount else 0
            data["currency"] = tx.currency
            data["status"] = tx.status
            data["failure_reason_raw"] = tx.failure_reason_raw
        results.append(data)
    return results

@router.get("/retries")
def get_retry_attempts(db: Session = Depends(get_db), limit: int = 50) -> List[Dict[str, Any]]:
    """Returns list of scheduled, pending, and completed retry attempts."""
    retries = db.query(RetryAttempt).order_by(desc(RetryAttempt.created_at)).limit(limit).all()
    results = []
    for r in retries:
        data = r.as_dict()
        tx = db.query(Transaction).filter(Transaction.id == r.transaction_id).first()
        if tx:
            data["payment_id"] = tx.razorpay_payment_id
            data["amount"] = float(tx.amount) if tx.amount else 0
            data["currency"] = tx.currency
            data["status"] = tx.status
        results.append(data)
    return results

@router.post("/run-retries")
async def trigger_due_retries() -> Dict[str, Any]:
    """Manually triggers the execution of all currently due retry attempts."""
    executed = await retry_scheduler.execute_due_retries()
    return {
        "status": "success",
        "due_retries_executed_count": len(executed),
        "executions": executed
    }
