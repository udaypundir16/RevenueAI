import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load environment variables
load_dotenv()

logger = logging.getLogger("revenue-recovery-ai.messenger")

# Supported Gemini models in priority order
GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]

def _get_field(obj: Any, field_name: str, default: Any = None) -> Any:
    """Helper to extract field from either an object (SQLAlchemy model) or a dict."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(field_name, default)
    return getattr(obj, field_name, default)

def generate_recovery_message(
    customer: Any,
    transaction: Any,
    reason: Optional[str] = None
) -> str:
    """
    Generates a personalized payment recovery notification using Google Gemini AI.
    
    Requirements:
    - Tone adapts dynamically based on customer.segment:
      * 'b2c': Friendly, empathetic, casual, and reassuring.
      * 'b2b': Formal, professional, executive, and invoice/billing-oriented.
    - Message MUST include a clear call-to-action (CTA).
    - Message MUST include the payment link placeholder '{payment_link}'.
    """
    customer_name = _get_field(customer, "name", "Valued Customer")
    customer_segment = str(_get_field(customer, "segment", "b2c")).lower().strip()
    
    amount = _get_field(transaction, "amount", 0.0)
    currency = _get_field(transaction, "currency", "INR")
    payment_id = _get_field(transaction, "razorpay_payment_id", "N/A")
    raw_reason = reason or _get_field(transaction, "failure_reason_raw", "payment_declined")
    
    # Format amount cleanly
    try:
        formatted_amount = f"{currency} {float(amount):,.2f}"
    except Exception:
        formatted_amount = f"{currency} {amount}"

    # Determine segment instructions
    if customer_segment == "b2b":
        segment_instruction = (
            "The customer is an enterprise/business account (B2B). Use a formal, professional, and courteous tone. "
            "Address them respectfully (e.g. 'Dear [Name]' or 'Hello [Name]'), reference the recent subscription or invoice renewal "
            f"for {formatted_amount}, mention the payment method encounter ({raw_reason}), and provide a clear executive call-to-action "
            "to update payment credentials or authorize the charge. Keep it concise (under 4 sentences)."
        )
    else:
        segment_instruction = (
            "The customer is an individual consumer (B2C). Use a friendly, warm, casual, and empathetic tone. "
            "Keep it friendly and reassuring (e.g. 'Hi [Name], quick heads up!'), mention that their recent charge "
            f"of {formatted_amount} didn't go through due to a quick hiccup ({raw_reason}), and provide a frictionless, friendly call-to-action "
            "to update their payment info so their service continues smoothly. Keep it concise (under 3 sentences)."
        )

    prompt = f"""You are an AI recovery assistant for a revenue recovery platform called RevenueAI.
Write an automated recovery notification for a customer whose payment failed.

Customer Details:
- Name: {customer_name}
- Segment: {customer_segment.upper()}
- Amount Due: {formatted_amount}
- Transaction ID: {payment_id}
- Failure Context: {raw_reason}

Tone and Style Guidelines:
{segment_instruction}

CRITICAL REQUIREMENTS:
1. You MUST include the exact literal placeholder '{{payment_link}}' in the text where the customer should click to update their payment method. Do not replace it with a fake URL; use the literal token '{{payment_link}}'.
2. Have an unmistakable, clear Call-To-Action (CTA).
3. Do NOT include email headers like 'Subject:' or quotation marks. Output only the message body.
"""

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    generated_text = None

    if gemini_api_key and len(gemini_api_key.strip()) > 5:
        # Primary: Direct HTTP REST endpoint with 6.0s timeout for speed and reliability
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_api_key.strip()}"
            req_body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}
            }
            with httpx.Client(timeout=6.0) as client:
                resp = client.post(url, json=req_body)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        generated_text = candidates[0]["content"]["parts"][0]["text"].strip()
                        logger.info(f"Generated recovery message using Gemini 3.6 Flash for {customer_segment}")
        except Exception as http_err:
            logger.debug(f"Direct Gemini REST attempt error: {http_err}")

        # Secondary: google.generativeai SDK if direct REST failed
        if not generated_text:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_api_key.strip(), transport="rest")
                model = genai.GenerativeModel("gemini-3.6-flash")
                response = model.generate_content(prompt, request_options={"timeout": 6})
                if response and response.text:
                    generated_text = response.text.strip()
            except Exception as sdk_err:
                logger.debug(f"SDK attempt error: {sdk_err}")

    # If Gemini failed or placeholder key or missing {payment_link}, provide tailored high-quality fallback
    if not generated_text:
        if customer_segment == "b2b":
            generated_text = (
                f"Dear {customer_name},\n\n"
                f"We were unable to process the scheduled billing of {formatted_amount} for your account due to an issuer notification ({raw_reason}). "
                "To maintain uninterrupted access to your enterprise services, please review and update your organization's payment method via the secure link below:\n\n"
                "{payment_link}\n\n"
                "If you require an updated corporate invoice or finance team assistance, please reply directly to this notification."
            )
        else:
            generated_text = (
                f"Hi {customer_name},\n\n"
                f"Quick heads up — we had trouble processing your recent payment of {formatted_amount} ({raw_reason}). "
                "No worries at all, these things happen! You can quickly update your card or retry your payment using the link below:\n\n"
                "{payment_link}\n\n"
                "Thanks for being with us!"
            )
    else:
        # Guarantee {payment_link} is present even if Gemini omitted it
        if "{payment_link}" not in generated_text:
            generated_text += "\n\nUpdate your payment details here: {payment_link}"

    return generated_text


def send_message(
    channel: str,
    content: str,
    customer: Any,
    transaction: Optional[Any] = None,
    db: Optional[Session] = None,
    supabase_tx_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends or mocks sending a recovery message and records it in the recovery_messages table.
    
    Requirements:
    - Default to MOCK_MODE=true env flag that logs/stores the message in recovery_messages table.
    - If SENDGRID_API_KEY is provided and MOCK_MODE is false, dispatches real email via SendGrid.
    - Stores the record in both local database (SQLAlchemy) and remote Supabase recovery_messages table.
    """
    from models.db_models import RecoveryMessage
    from db.connection import get_supabase_client, is_supabase_configured, get_db_session

    customer_email = _get_field(customer, "email", "customer@example.com")
    customer_phone = _get_field(customer, "phone", "")
    customer_name = _get_field(customer, "name", "Customer")
    customer_segment = str(_get_field(customer, "segment", "b2c")).upper()
    tx_id = _get_field(transaction, "id")
    if isinstance(tx_id, str):
        try:
            import uuid as _uuid
            tx_id = _uuid.UUID(tx_id)
        except Exception:
            pass
    razorpay_id = _get_field(transaction, "razorpay_payment_id", "N/A")

    channel_normalized = channel.lower().strip()
    if channel_normalized not in ["email", "sms", "whatsapp"]:
        channel_normalized = "email"

    mock_mode_env = os.getenv("MOCK_MODE", "true").lower() in ["true", "1", "yes"]
    sendgrid_key = os.getenv("SENDGRID_API_KEY", "").strip()

    # Determine execution mode
    is_mock = mock_mode_env or not sendgrid_key
    dispatch_status = "mocked" if is_mock else "sent"
    error_message = None

    # Replace placeholder with realistic payment link for demo/production
    actual_payment_link = f"https://pay.revenueai.dev/update-card?ref={razorpay_id}"
    rendered_content = content.replace("{payment_link}", actual_payment_link)

    # 1. Real Dispatch if SendGrid API Key is configured and mock mode is disabled
    if not is_mock and channel_normalized == "email":
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {sendgrid_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{
                    "to": [{"email": customer_email, "name": customer_name}]
                }],
                "from": {"email": "recovery@revenueai.dev", "name": "RevenueAI Billing"},
                "subject": f"Payment Update Required - Transaction {razorpay_id}",
                "content": [{"type": "text/plain", "value": rendered_content}]
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code in [200, 201, 202]:
                    dispatch_status = "sent"
                    logger.info(f"Successfully sent email via SendGrid to {customer_email}")
                else:
                    dispatch_status = "failed"
                    error_message = f"SendGrid error {res.status_code}: {res.text}"
                    logger.warning(error_message)
        except Exception as sg_err:
            dispatch_status = "failed"
            error_message = str(sg_err)
            logger.error(f"SendGrid exception: {sg_err}")

    # 2. Persist to local database (SQLAlchemy)
    local_msg_id = None
    sent_at_time = datetime.now(timezone.utc)

    # Use provided session or create a scoped one
    session_to_use = db
    close_session_after = False
    if not session_to_use:
        session_to_use = get_db_session()
        close_session_after = True

    try:
        if session_to_use and tx_id:
            db_msg = RecoveryMessage(
                transaction_id=tx_id,
                channel=channel_normalized,
                content=rendered_content,
                sent_at=sent_at_time,
            )
            session_to_use.add(db_msg)
            session_to_use.commit()
            session_to_use.refresh(db_msg)
            local_msg_id = str(db_msg.id)
    except Exception as db_err:
        logger.warning(f"Could not persist recovery message to local DB: {db_err}")
        if session_to_use:
            session_to_use.rollback()
    finally:
        if close_session_after and session_to_use:
            session_to_use.close()

    # 3. Synchronize with remote Supabase recovery_messages table
    supabase_msg_id = None
    try:
        if is_supabase_configured():
            supabase = get_supabase_client()
            if supabase:
                remote_tx_id = supabase_tx_id
                if not remote_tx_id and razorpay_id != "N/A":
                    sb_lookup = supabase.table("transactions").select("id").eq("razorpay_payment_id", razorpay_id).limit(1).execute()
                    if sb_lookup.data:
                        remote_tx_id = sb_lookup.data[0]["id"]
                if not remote_tx_id and tx_id:
                    remote_tx_id = str(tx_id)

                if remote_tx_id:
                    sb_res = supabase.table("recovery_messages").insert({
                        "transaction_id": remote_tx_id,
                        "channel": channel_normalized,
                        "content": rendered_content,
                        "sent_at": sent_at_time.isoformat(),
                    }).execute()
                    if sb_res.data:
                        supabase_msg_id = sb_res.data[0]["id"]
    except Exception as sb_err:
        logger.warning(f"Could not persist recovery message to Supabase: {sb_err}")

    # 4. Console output for hackathon demo transparency
    try:
        mode_label = "[MOCK MODE - SIMULATED]" if is_mock else "[LIVE DISPATCH]"
        print("\n" + "=" * 80)
        print(f" [MESSENGER AGENT] {mode_label} RECOVERY NOTIFICATION DISPATCH")
        print("=" * 80)
        print(f" - Recipient:   {customer_name} <{customer_email}> ({customer_segment})")
        print(f" - Channel:     {channel_normalized.upper()}")
        print(f" - Status:      {dispatch_status.upper()}")
        print(f" - Local ID:    {local_msg_id or 'N/A'}")
        print(f" - Supabase ID: {supabase_msg_id or 'Local only'}")
        print("-" * 80)
        print(rendered_content)
        print("=" * 80 + "\n")
    except Exception:
        pass

    return {
        "status": dispatch_status,
        "is_mock": is_mock,
        "channel": channel_normalized,
        "customer_email": customer_email,
        "customer_segment": customer_segment,
        "local_message_id": local_msg_id,
        "supabase_message_id": supabase_msg_id,
        "rendered_content": rendered_content,
        "sent_at": sent_at_time.isoformat(),
        "error": error_message
    }
