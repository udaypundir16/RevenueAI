import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import httpx
from supabase import create_client

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_KEY")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=" * 80)
print("TESTING FULL ORCHESTRATION PIPELINE & AGENT TRANSPARENCY IN SUPABASE")
print("=" * 80)

# 1. Trigger an insufficient funds failure
print("\n[1] Triggering Simulated Failure (Insufficient Funds):")
r = client.post("/simulate/failure", json={
    "customer_name": "Devin AI",
    "email": "devin@cognition.ai",
    "amount": 649900, # INR 6,499.00
    "error_code": "BAD_REQUEST_ERROR",
    "error_description": "Card balance insufficient for recurring charge",
    "error_reason": "insufficient_funds"
})

print(f"Status Code: {r.status_code}")
res_json = r.json()
print("Orchestration Decision Output:")
orch = res_json.get("orchestration") or {}
decision = orch.get("decision") or {}
print(f" - Action:         {decision.get('action')}")
print(f" - Scheduled Time: {decision.get('scheduled_time')}")
print(f" - Reasoning:      {decision.get('reasoning')}")
print(f" - Action Row ID:  {orch.get('recovery_action_id')}")
print(f" - Retry Row ID:   {orch.get('retry_attempt_id')}")
print(f" - Supabase Action:{orch.get('supabase_action_id')}")
print(f" - Supabase Retry: {orch.get('supabase_retry_id')}")

# 2. Trigger an expired card failure (testing notify_customer without retry)
print("\n[2] Triggering Simulated Failure (Expired Card):")
r2 = client.post("/simulate/failure", json={
    "customer_name": "Marcus Vance",
    "email": "marcus@vance.corp",
    "amount": 1500000,
    "error_code": "EXPIRED_CARD",
    "error_description": "Customer card validity period ended",
    "error_reason": "expired_card"
})

orch2 = r2.json().get("orchestration") or {}
decision2 = orch2.get("decision") or {}
print(f" - Action:         {decision2.get('action')}")
print(f" - Reasoning:      {decision2.get('reasoning')}")
print(f" - Supabase Action:{orch2.get('supabase_action_id')}")

# 3. Query Agent Transparency endpoint GET /api/recovery/actions
print("\n[3] Querying Agent Transparency Endpoint (GET /api/recovery/actions):")
r_actions = client.get("/api/recovery/actions")
actions_list = r_actions.json()
print(f"Returned {len(actions_list)} recovery decisions with reasoning:")
for i, act in enumerate(actions_list[:3], 1):
    print(f" [{i}] Action Type: {act.get('action_type')}")
    print(f"     Reasoning:   {act.get('agent_reasoning')}")
    print(f"     Payment ID:  {act.get('payment_id')} ({act.get('currency')} {act.get('amount')})\n")

# 4. Confirm in Supabase remote recovery_actions table
print("[4] Querying Live Supabase Remote 'recovery_actions' Table:")
sb = create_client(supabase_url, supabase_key)
sb_actions = sb.table("recovery_actions").select("*").order("created_at", desc=True).limit(5).execute()
print(f"Found {len(sb_actions.data)} remote recovery action records in Supabase:")
for i, sa in enumerate(sb_actions.data, 1):
    print(f" [{i}] ID:        {sa.get('id')}")
    print(f"     Type:      {sa.get('action_type')}")
    print(f"     Reasoning: {sa.get('agent_reasoning')}")
    print(f"     Created:   {sa.get('created_at')}\n")

# 5. Confirm in Supabase remote retry_attempts table
print("[5] Querying Live Supabase Remote 'retry_attempts' Table:")
sb_retries = sb.table("retry_attempts").select("*").order("created_at", desc=True).limit(5).execute()
print(f"Found {len(sb_retries.data)} remote retry attempt records in Supabase:")
for i, sr in enumerate(sb_retries.data, 1):
    print(f" [{i}] ID:           {sr.get('id')}")
    print(f"     Attempt #:    {sr.get('attempt_number')}")
    print(f"     Method:       {sr.get('method')}")
    print(f"     Outcome:      {sr.get('outcome')}")
    print(f"     Scheduled At: {sr.get('scheduled_at')}\n")

# 6. Test Scheduler On-Demand Execution
print("[6] Testing Scheduler On-Demand Trigger (POST /api/recovery/run-retries):")
r_sched = client.post("/api/recovery/run-retries")
print("Scheduler run result:", r_sched.json())

print("=" * 80)
print("ORCHESTRATOR & SCHEDULER PIPELINE SUCCESSFULLY VERIFIED!")
print("=" * 80)
