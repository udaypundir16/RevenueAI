#!/usr/bin/env python3
"""
Revenue Recovery AI - Realistic Demo Stream Generator
Simulates a live stream of varied Razorpay payment failure webhook events
to populate the dashboard, trigger AI classifications, test the Orchestration Agent,
and generate Gemini adaptive dunning messages in real-time.
"""

import os
import sys
import time
import random
import argparse
import asyncio
from typing import List, Dict, Any
import httpx

DEMO_SCENARIOS = [
    {
        "customer_name": "Ananya Roy",
        "email": "ananya.roy@gmail.com",
        "contact": "+919811223344",
        "segment": "b2c",
        "amount": 299900,  # INR 2,999.00
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment was declined due to insufficient balance in account",
        "error_reason": "insufficient_funds",
        "expected_action": "retry_later (2-3d)"
    },
    {
        "customer_name": "Aditya Sengupta",
        "email": "aditya.s@outlook.com",
        "contact": "+919822334455",
        "segment": "b2c",
        "amount": 149900,  # INR 1,499.00
        "error_code": "CARD_EXPIRED",
        "error_description": "The card has expired and cannot be charged",
        "error_reason": "expired_card",
        "expected_action": "notify_customer (Gemini Dunning)"
    },
    {
        "customer_name": "TechVentures Global Ltd",
        "email": "billing@techventures.io",
        "contact": "+919833445566",
        "segment": "b2b",
        "amount": 4900000,  # INR 49,000.00
        "error_code": "CARD_EXPIRED",
        "error_description": "Corporate procurement card validity date passed",
        "error_reason": "expired_card",
        "expected_action": "notify_customer (B2B Formal)"
    },
    {
        "customer_name": "Bharat Logistics Hub",
        "email": "accounts@bharatlogistics.in",
        "contact": "+919844556677",
        "segment": "b2b",
        "amount": 1850000,  # INR 18,500.00
        "error_code": "BANK_POLICY_DECLINE",
        "error_description": "Transaction declined by customer bank risk policy",
        "error_reason": "bank_decline",
        "expected_action": "retry_later (6h window)"
    },
    {
        "customer_name": "Rohit Malhotra",
        "email": "rohit.m@gmail.com",
        "contact": "+919855667788",
        "segment": "b2c",
        "amount": 349900,  # INR 3,499.00
        "error_code": "GATEWAY_TIMEOUT",
        "error_description": "Issuer switch timeout on 3DS verification socket",
        "error_reason": "network_error",
        "expected_action": "retry_now (5-15m)"
    },
    {
        "customer_name": "Zenith Cloud Solutions",
        "email": "finance@zenithcloud.com",
        "contact": "+919866778899",
        "segment": "b2b",
        "amount": 7500000,  # INR 75,000.00
        "error_code": "INSUFFICIENT_FUNDS",
        "error_description": "Available corporate credit limit exceeded for current billing cycle",
        "error_reason": "insufficient_funds",
        "expected_action": "retry_later (2-3d)"
    },
    {
        "customer_name": "Deepak Khurana",
        "email": "deepak.k@yahoo.in",
        "contact": "+919877889900",
        "segment": "b2c",
        "amount": 99900,  # INR 999.00
        "error_code": "BANK_AUTHENTICATION_FAILED",
        "error_description": "Customer failed to complete 2FA authentication challenge",
        "error_reason": "bank_decline",
        "expected_action": "retry_later (6h)"
    },
    {
        "customer_name": "High Velocity Entity",
        "email": "flagged_buyer@darkweb.ru",
        "contact": "+919888990011",
        "segment": "b2c",
        "amount": 9999900,  # INR 99,999.00
        "error_code": "FRAUD_SECURITY_BLOCK",
        "error_description": "Card blacklisted by risk engine high velocity trigger",
        "error_reason": "risk_block",
        "expected_action": "escalate (Manual review)"
    },
    {
        "customer_name": "Sneha Trivedi",
        "email": "sneha.trivedi@corp.net",
        "contact": "+919899001122",
        "segment": "b2c",
        "amount": 649900,  # INR 6,499.00
        "error_code": "CONNECTION_RESET",
        "error_description": "TCP connection reset by issuer acquiring switch",
        "error_reason": "network_error",
        "expected_action": "retry_now (5m)"
    },
    {
        "customer_name": "Nirvana Wellness Spa",
        "email": "manager@nirvanawellness.in",
        "contact": "+919800112233",
        "segment": "b2b",
        "amount": 1250000,  # INR 12,500.00
        "error_code": "DECLINED_GENERIC",
        "error_description": "Generic do-not-honor decline response code 05",
        "error_reason": "unknown",
        "expected_action": "notify_customer"
    }
]

def post_single_simulation(
    scenario: Dict[str, Any],
    backend_url: str = "http://localhost:8000"
) -> Dict[str, Any]:
    """Posts a single simulated payment failure to the backend endpoint."""
    endpoint = f"{backend_url.rstrip('/')}/simulate/failure"
    payload = {
        "customer_name": scenario["customer_name"],
        "email": scenario["email"],
        "contact": scenario.get("contact", "+919800000000"),
        "amount": scenario["amount"],
        "error_code": scenario["error_code"],
        "error_description": scenario["error_description"],
        "error_reason": scenario["error_reason"],
        "segment": scenario.get("segment", "b2c")
    }

    with httpx.Client(timeout=25.0) as client:
        resp = client.post(endpoint, json=payload)
        resp.raise_for_status()
        return resp.json()

async def run_simulation_stream_async(
    count: int = 5,
    interval: float = 0.5,
    backend_url: str = "http://localhost:8000"
) -> List[Dict[str, Any]]:
    """Runs a stream of N simulated failure events asynchronously with delay intervals."""
    results = []
    selected_scenarios = []
    
    # Select scenarios ensuring variety
    scenarios_pool = list(DEMO_SCENARIOS)
    random.shuffle(scenarios_pool)
    for i in range(count):
        selected_scenarios.append(scenarios_pool[i % len(scenarios_pool)])

    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, sc in enumerate(selected_scenarios, 1):
            endpoint = f"{backend_url.rstrip('/')}/simulate/failure"
            payload = {
                "customer_name": sc["customer_name"],
                "email": sc["email"],
                "contact": sc.get("contact", "+919800000000"),
                "amount": sc["amount"],
                "error_code": sc["error_code"],
                "error_description": sc["error_description"],
                "error_reason": sc["error_reason"],
                "segment": sc.get("segment", "b2c")
            }
            try:
                res = await client.post(endpoint, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    orch = data.get("orchestration", {})
                    results.append({
                        "step": idx,
                        "payment_id": data.get("payment_id"),
                        "customer": sc["customer_name"],
                        "email": sc["email"],
                        "segment": sc["segment"].upper(),
                        "amount_inr": sc["amount"] / 100.0,
                        "failure_reason": sc["error_reason"],
                        "action": orch.get("decision", {}).get("action", "processed"),
                        "reasoning": orch.get("decision", {}).get("reasoning", "")[:120],
                        "has_message": bool(orch.get("recovery_message")),
                        "status": "success"
                    })
                else:
                    results.append({
                        "step": idx,
                        "customer": sc["customer_name"],
                        "status": f"HTTP {res.status_code}",
                        "error": res.text
                    })
            except Exception as e:
                results.append({
                    "step": idx,
                    "customer": sc["customer_name"],
                    "status": "error",
                    "error": str(e)
                })

            if idx < count and interval > 0:
                await asyncio.sleep(interval)

    return results

def run_cli():
    parser = argparse.ArgumentParser(description="RevenueAI Demo Simulation Streamer")
    parser.add_argument("--count", type=int, default=5, help="Number of failure events to simulate (default: 5)")
    parser.add_argument("--interval", type=float, default=1.0, help="Interval in seconds between events (default: 1.0)")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Backend API base URL")
    args = parser.parse_args()

    print("\n" + "=" * 80)
    print(f" REVENUE RECOVERY AI - DEMO STREAM GENERATOR (Target: {args.count} Events)")
    print("=" * 80)
    print(f" - API Target:   {args.url}")
    print(f" - Interval:     {args.interval}s")
    print(f" - Pipeline:     Failure -> Classification -> Decision -> Dunning Delivery\n")

    scenarios_pool = list(DEMO_SCENARIOS)
    random.shuffle(scenarios_pool)

    for i in range(args.count):
        sc = scenarios_pool[i % len(scenarios_pool)]
        print(f"[{i+1}/{args.count}] Emitting Failure Event for {sc['customer_name']} ({sc['segment'].upper()})...")
        t0 = time.time()
        try:
            res = post_single_simulation(sc, backend_url=args.url)
            elapsed = time.time() - t0
            payment_id = res.get("payment_id", "N/A")
            orch = res.get("orchestration", {})
            decision = orch.get("decision", {})
            action = decision.get("action", "processed")
            reasoning = decision.get("reasoning", "N/A")
            msg = orch.get("recovery_message")

            print(f"   ✓ Event: {payment_id} | Amount: INR {sc['amount']/100:,.2f}")
            print(f"   ✓ Raw Reason: '{sc['error_reason']}' -> Agent Action: [{action.upper()}] (in {elapsed:.2f}s)")
            print(f"   ✓ Agent Reasoning: {reasoning[:100]}...")
            if msg:
                print(f"   ✓ Gemini Dunning Generated: Dispatched to {sc['email']} (Length: {len(msg.get('rendered_content', ''))} chars)")
            print("-" * 80)
        except Exception as err:
            print(f"   ✗ Simulation error: {err}")

        if i < args.count - 1 and args.interval > 0:
            time.sleep(args.interval)

    print("\n[COMPLETE] Demo stream finished. Check your Dashboard at http://localhost:5173/ to see live updates!\n")

if __name__ == "__main__":
    run_cli()
