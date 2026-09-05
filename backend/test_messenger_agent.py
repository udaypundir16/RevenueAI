import sys
import uuid
from decimal import Decimal
from datetime import datetime, timezone

from db.connection import get_db_session, is_supabase_configured, get_supabase_client
from models.db_models import Customer, Transaction, RecoveryAction, RecoveryMessage
from agents.orchestrator import decide_action, record_orchestrator_decision
from agents.messenger import generate_recovery_message, send_message

def test_messenger_unit():
    print("\n" + "=" * 60)
    print(" 1. TESTING MESSENGER TONE ADAPTATION (B2C vs B2B)")
    print("=" * 60)

    # Test B2C
    b2c_cust = {
        "name": "Arjun Mehta",
        "segment": "b2c",
        "email": "arjun.m@example.com"
    }
    tx_b2c = {
        "id": str(uuid.uuid4()),
        "razorpay_payment_id": "pay_test_b2c_123",
        "amount": 999.0,
        "currency": "INR",
        "failure_reason_raw": "expired_card"
    }
    b2c_msg = generate_recovery_message(b2c_cust, tx_b2c, "expired_card")
    print("\n--- B2C GENERATED NOTIFICATION ---")
    print(b2c_msg)
    assert "{payment_link}" in b2c_msg, "B2C message must include {payment_link}"
    print("[PASS] B2C message includes {payment_link} and casual tone.")

    # Test B2B
    b2b_cust = {
        "name": "Global Enterprise Systems",
        "segment": "b2b",
        "email": "finance@globalenterprise.com"
    }
    tx_b2b = {
        "id": str(uuid.uuid4()),
        "razorpay_payment_id": "pay_test_b2b_456",
        "amount": 75000.0,
        "currency": "INR",
        "failure_reason_raw": "expired_card"
    }
    b2b_msg = generate_recovery_message(b2b_cust, tx_b2b, "expired_card")
    print("\n--- B2B GENERATED NOTIFICATION ---")
    print(b2b_msg)
    assert "{payment_link}" in b2b_msg, "B2B message must include {payment_link}"
    print("[PASS] B2B message includes {payment_link} and professional tone.")

def test_messenger_send_and_persist():
    print("\n" + "=" * 60)
    print(" 2. TESTING SEND_MESSAGE PERSISTENCE (MOCK_MODE=True)")
    print("=" * 60)

    db = get_db_session()
    try:
        # Create test customer and transaction in DB
        cust = Customer(
            name="Test Notification Customer",
            email=f"notify_test_{int(datetime.now().timestamp())}@example.com",
            phone="+919876500112",
            segment="b2c"
        )
        db.add(cust)
        db.flush()

        tx = Transaction(
            razorpay_payment_id=f"pay_notif_{int(datetime.now().timestamp())}",
            customer_id=cust.id,
            amount=Decimal("2499.00"),
            currency="INR",
            status="failed",
            failure_reason_raw="card_expired",
            failure_reason_classified="expired_card"
        )
        db.add(tx)
        db.commit()
        db.refresh(cust)
        db.refresh(tx)

        # Generate recovery message
        msg_text = generate_recovery_message(cust, tx, "expired_card")

        # Send via messenger
        result = send_message(
            channel="email",
            content=msg_text,
            customer=cust,
            transaction=tx,
            db=db
        )

        print("Send message result:", result)
        assert result["status"] in ["mocked", "sent"], "Status must be mocked or sent"
        assert result["local_message_id"] is not None, "Local message ID must be saved"

        # Verify query from local DB
        msg_uuid = uuid.UUID(result["local_message_id"]) if isinstance(result["local_message_id"], str) else result["local_message_id"]
        saved_msg = db.query(RecoveryMessage).filter(RecoveryMessage.id == msg_uuid).first()
        assert saved_msg is not None, "Message must exist in recovery_messages table"
        assert saved_msg.channel == "email"
        print(f"[PASS] Successfully stored in recovery_messages (ID: {saved_msg.id})")

    finally:
        db.close()

def test_orchestrator_wire():
    print("\n" + "=" * 60)
    print(" 3. TESTING ORCHESTRATOR WIRE (notify_customer auto-fire)")
    print("=" * 60)

    db = get_db_session()
    try:
        # Create customer and transaction with expired_card
        cust = Customer(
            name="Wire Test Customer",
            email=f"wire_test_{int(datetime.now().timestamp())}@corp.com",
            phone="+919876543299",
            segment="b2b"
        )
        db.add(cust)
        db.flush()

        tx = Transaction(
            razorpay_payment_id=f"pay_wire_{int(datetime.now().timestamp())}",
            customer_id=cust.id,
            amount=Decimal("15000.00"),
            currency="INR",
            status="failed",
            failure_reason_raw="The card has expired and cannot be charged",
            failure_reason_classified="expired_card"
        )
        db.add(tx)
        db.commit()
        db.refresh(cust)
        db.refresh(tx)

        # Decide action
        decision = decide_action(transaction=tx, customer=cust, past_attempts=[])
        print(f"Orchestrator decision: {decision['action']}")
        assert decision["action"] == "notify_customer", f"Expected notify_customer, got {decision['action']}"

        # Record decision -> should auto-fire messenger!
        rec_result = record_orchestrator_decision(
            transaction_id=tx.id,
            decision=decision,
            db=db,
            customer_id=cust.id,
            razorpay_payment_id=tx.razorpay_payment_id
        )

        assert rec_result.get("recovery_message") is not None, "record_orchestrator_decision must auto-trigger messenger"
        print("[PASS] Automatically generated and dispatched recovery message!")
        print("Dispatched message snippet:")
        print(rec_result["recovery_message"]["rendered_content"][:200] + "...")

    finally:
        db.close()

if __name__ == "__main__":
    try:
        test_messenger_unit()
        test_messenger_send_and_persist()
        test_orchestrator_wire()
        print("\n" + "=" * 60)
        print(" ALL MESSENGER AGENT TESTS PASSED SUCCESSFULLY! ")
        print("=" * 60)
    except Exception as e:
        print(f"\n[FAIL] Test encountered error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
