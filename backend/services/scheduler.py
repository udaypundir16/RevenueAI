import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy import select, and_

from db.connection import SessionLocal, get_supabase_client, is_supabase_configured
from models.db_models import RetryAttempt, Transaction
from services.razorpay_service import razorpay_retry_service

logger = logging.getLogger("revenue-recovery-ai.scheduler")

class RetryScheduler:
    """Background polling scheduler that executes due retry_attempts every 60 seconds."""

    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._is_running: bool = False

    async def run_single_retry(self, retry_attempt_id: str) -> Dict[str, Any]:
        """Executes a single retry attempt given its ID."""
        db = SessionLocal()
        try:
            attempt = db.query(RetryAttempt).filter(RetryAttempt.id == retry_attempt_id).first()
            if not attempt or attempt.outcome != "pending":
                return {"status": "skipped", "message": "Attempt not found or already processed"}

            transaction = db.query(Transaction).filter(Transaction.id == attempt.transaction_id).first()
            if not transaction:
                return {"status": "error", "message": "Transaction not found"}

            now_utc = datetime.now(timezone.utc)
            # Call Razorpay retry service
            result = await razorpay_retry_service.execute_retry(
                transaction=transaction,
                attempt_number=attempt.attempt_number
            )

            is_success = result.get("success", False)
            attempt.executed_at = now_utc
            attempt.outcome = "success" if is_success else "failed"

            if is_success:
                transaction.status = "recovered"
                logger.info(f"Transaction {transaction.id} recovered successfully on attempt #{attempt.attempt_number}!")
            else:
                transaction.status = "failed"
                logger.info(f"Transaction {transaction.id} retry #{attempt.attempt_number} unsuccessful.")

            db.commit()

            # Sync to remote Supabase
            try:
                if is_supabase_configured():
                    supabase = get_supabase_client()
                    if supabase:
                        # Update retry_attempts in Supabase
                        supabase.table("retry_attempts").update({
                            "executed_at": now_utc.isoformat(),
                            "outcome": attempt.outcome
                        }).eq("transaction_id", str(transaction.id)).execute()

                        # Update transaction status in Supabase
                        supabase.table("transactions").update({
                            "status": transaction.status
                        }).eq("id", str(transaction.id)).execute()
            except Exception as sb_err:
                logger.warning(f"Supabase scheduler sync notice: {sb_err}")

            return {
                "status": "completed",
                "outcome": attempt.outcome,
                "transaction_status": transaction.status,
                "retry_result": result
            }
        finally:
            db.close()

    async def execute_due_retries(self) -> List[Dict[str, Any]]:
        """Scans the database for retry attempts scheduled <= now() with outcome='pending'."""
        db = SessionLocal()
        due_attempts = []
        try:
            now_utc = datetime.now(timezone.utc)
            due_records = db.query(RetryAttempt).filter(
                and_(
                    RetryAttempt.outcome == "pending",
                    RetryAttempt.scheduled_at <= now_utc
                )
            ).all()

            due_attempts = [str(r.id) for r in due_records]
        finally:
            db.close()

        if due_attempts:
            logger.info(f"Found {len(due_attempts)} due retry attempt(s) ready for execution.")

        results = []
        for attempt_id in due_attempts:
            res = await self.run_single_retry(attempt_id)
            results.append({"attempt_id": attempt_id, "result": res})

        return results

    async def _loop(self):
        logger.info(f"RetryScheduler started. Polling every {self.interval_seconds} seconds.")
        while self._is_running:
            try:
                await self.execute_due_retries()
            except Exception as e:
                logger.error(f"Error in RetryScheduler execution loop: {e}")
            await asyncio.sleep(self.interval_seconds)

    def start(self):
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._loop())

    def stop(self):
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("RetryScheduler stopped.")

retry_scheduler = RetryScheduler(interval_seconds=60)
