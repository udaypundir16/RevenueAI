import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import httpx
from supabase import create_client

# Set encoding for Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_KEY")

print("=" * 80)
print("TESTING RAZORPAY TEST-MODE FAILURES & CONFIRMING IN SUPABASE")
print("=" * 80)

test_cases = [
    {
        "customer_name": "Neha Patel",
        "email": "neha.patel@startup.io",
        "amount": 420000, # INR 4,200.00
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment failed due to insufficient funds in customer bank account",
        "error_reason": "insufficient_funds",
        "method": "card"
    },
    {
        "customer_name": "Vikram Mehta",
        "email": "vikram.mehta@enterprise.com",
        "amount": 1250000, # INR 12,500.00
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "The card has expired. Please use an alternate payment method.",
        "error_reason": "expired_card",
        "method": "card"
    },
    {
        "customer_name": "Ananya Deshmukh",
        "email": "ananya.deshmukh@fintech.co",
        "amount": 799900, # INR 7,999.00
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Your bank declined the transaction. Do not honor.",
        "error_reason": "do_not_honor",
        "method": "card"
    }
]

# 1. Trigger failures via /simulate/failure
print("\n[1] Triggering Simulated Razorpay Failures via POST /simulate/failure:")
for idx, case in enumerate(test_cases, 1):
    r = httpx.post("http://127.0.0.1:8000/simulate/failure", json=case, timeout=10.0)
    data = r.json()
    c_name = case["customer_name"]
    c_email = case["email"]
    p_id = data.get("payment_id")
    synced = data.get("supabase_synced")
    sb_id = data.get("supabase_id")
    amt = f"{data.get('currency')} {data.get('amount')}"
    st = data.get("transaction_status")
    reason = data.get("failure_reason_raw")
    print(f"  {idx}. Customer: {c_name} ({c_email})")
    print(f"     • Payment ID:      {p_id}")
    print(f"     • Supabase Sync:   {synced}")
    print(f"     • Supabase Row ID: {sb_id}")
    print(f"     • Amount:          {amt}")
    print(f"     • Status:          {st}")
    print(f"     • Raw Reason:      {reason}\n")

# 2. Query Supabase directly to confirm rows exist in the remote transactions table
print("[2] Querying Live Supabase Remote Database directly:")
sb = create_client(supabase_url, supabase_key)
res = sb.table("transactions").select(
    "id, razorpay_payment_id, customer_id, amount, currency, status, failure_reason_raw, failure_reason_classified, created_at"
).order("created_at", desc=True).limit(10).execute()

print(f"  [SUCCESS] Found {len(res.data)} total transactions in Supabase:\n")
for i, row in enumerate(res.data, 1):
    print(f"  [{i}] ID:         {row['id']}")
    print(f"      Payment ID: {row['razorpay_payment_id']}")
    print(f"      Amount:     {row['currency']} {row['amount']}")
    print(f"      Status:     {row['status']}")
    print(f"      Reason:     {row['failure_reason_raw']}")
    print(f"      Classified: {row['failure_reason_classified']}")
    print(f"      Created At: {row['created_at']}\n")

print("=" * 80)
