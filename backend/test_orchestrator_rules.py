import sys
from datetime import datetime, timezone
from pathlib import Path

# Reconfigure stdout for UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from agents.orchestrator import decide_action, record_orchestrator_decision
from db.connection import SessionLocal
from models.db_models import Transaction, Customer, RetryAttempt

print("=" * 80)
print("UNIT TESTING ORCHESTRATOR DECISION MATRIX")
print("=" * 80)

# Mock Transaction & Customer helper
class MockTransaction:
    def __init__(self, failure_raw, failure_classified, amount=5000.0, currency="INR"):
        self.id = "mock_tx_123"
        self.failure_reason_raw = failure_raw
        self.failure_reason_classified = failure_classified
        self.amount = amount
        self.currency = currency

class MockCustomer:
    def __init__(self, email="user@test.com", segment="b2c"):
        self.id = "mock_cust_123"
        self.email = email
        self.segment = segment

# Scenario 1: Insufficient Funds
tx1 = MockTransaction("BAD_REQUEST: Insufficient funds in account", "insufficient_funds")
d1 = decide_action(tx1)
print("\n[Scenario 1: Insufficient Funds]")
print(f" • Expected: retry_later in 48h")
print(f" • Result:   Action = {d1['action']} | DB = {d1['db_action_type']}")
print(f" • Time:     {d1['scheduled_time']}")
print(f" • Reasoning: {d1['reasoning']}")
assert d1['action'] == 'retry_later'
assert d1['scheduled_time'] is not None

# Scenario 2: Expired Card
tx2 = MockTransaction("Card expired on 08/26", "expired_card")
d2 = decide_action(tx2)
print("\n[Scenario 2: Expired Card]")
print(f" • Expected: notify_customer (no retry)")
print(f" • Result:   Action = {d2['action']} | DB = {d2['db_action_type']}")
print(f" • Time:     {d2['scheduled_time']}")
print(f" • Reasoning: {d2['reasoning']}")
assert d2['action'] == 'notify_customer'
assert d2['scheduled_time'] is None

# Scenario 3A: Bank Decline - Attempt 1
tx3a = MockTransaction("Do not honor from issuing bank", "bank_decline")
d3a = decide_action(tx3a, past_attempts=[])
print("\n[Scenario 3A: Bank Decline (Attempt 1)]")
print(f" • Expected: retry_later in 6h (attempt 1)")
print(f" • Result:   Action = {d3a['action']} | DB = {d3a['db_action_type']}")
print(f" • Time:     {d3a['scheduled_time']}")
print(f" • Reasoning: {d3a['reasoning']}")
assert d3a['action'] == 'retry_later'
assert d3a['scheduled_time'] is not None

# Scenario 3B: Bank Decline - Max attempts exceeded (Attempt 2+)
d3b = decide_action(tx3a, past_attempts=[1, 2])
print("\n[Scenario 3B: Bank Decline (Attempt 2+ exceeded)]")
print(f" • Expected: notify_customer after 2 attempts")
print(f" • Result:   Action = {d3b['action']} | DB = {d3b['db_action_type']}")
print(f" • Time:     {d3b['scheduled_time']}")
print(f" • Reasoning: {d3b['reasoning']}")
assert d3b['action'] == 'notify_customer'
assert d3b['scheduled_time'] is None

# Scenario 4: Network Error
tx4 = MockTransaction("Gateway timeout: HTTP 504", "network_error")
d4 = decide_action(tx4, past_attempts=[])
print("\n[Scenario 4: Network Error]")
print(f" • Expected: retry_now within 1h")
print(f" • Result:   Action = {d4['action']} | DB = {d4['db_action_type']}")
print(f" • Time:     {d4['scheduled_time']}")
print(f" • Reasoning: {d4['reasoning']}")
assert d4['action'] == 'retry_now'
assert d4['scheduled_time'] is not None

# Scenario 5: Risk Block
tx5 = MockTransaction("Transaction blocked by fraud rule", "risk_block")
d5 = decide_action(tx5)
print("\n[Scenario 5: Risk Block]")
print(f" • Expected: escalate (no customer contact, no retry)")
print(f" • Result:   Action = {d5['action']} | DB = {d5['db_action_type']}")
print(f" • Time:     {d5['scheduled_time']}")
print(f" • Reasoning: {d5['reasoning']}")
assert d5['action'] == 'escalate'
assert d5['scheduled_time'] is None

# Scenario 6: Unknown
tx6 = MockTransaction("Unknown error 99", "unknown")
d6 = decide_action(tx6)
print("\n[Scenario 6: Unknown Failure]")
print(f" • Expected: notify_customer with generic message")
print(f" • Result:   Action = {d6['action']} | DB = {d6['db_action_type']}")
print(f" • Time:     {d6['scheduled_time']}")
print(f" • Reasoning: {d6['reasoning']}")
assert d6['action'] == 'notify_customer'
assert d6['scheduled_time'] is None

print("\n" + "=" * 80)
print("ALL 6 ORCHESTRATION RULES PASSED UNIT TESTS PERFECTLY!")
print("=" * 80)
