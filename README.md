# Revenue Recovery AI 🚀

An autonomous, agentic payment recovery platform designed to eliminate involuntary churn. Built for modern subscription and recurring billing businesses on payment gateways like **Razorpay**.

Unlike traditional rigid dunning tools that blindly retry cards at arbitrary intervals and blast generic email templates, **Revenue Recovery AI** analyzes every payment failure event in real time:
1. **Classifies failure root causes** using intelligent heuristic and LLM diagnostics (insufficient funds, expired cards, bank declines, network timeouts, risk blocks).
2. **Orchestrates recovery strategy** via an autonomous decision agent (smart time-delayed retries, instant socket retry, customer notification, or risk escalation).
3. **Drafts personalized dunning outreach** using **Google Gemini AI**, dynamically adapting tone by customer segment (**B2C Friendly/Empathetic** vs **B2B Formal/Executive**).
4. **Executes automated retries** via an autonomous background scheduler loop.
5. **Provides complete agent transparency** with a vertical 5-step lifecycle audit trail for every transaction.

---

## 🏗️ Architecture & Agentic Flow

```text
               ┌────────────────────────────────────────────────────────┐
               │    Payment Failure Ingestion (Razorpay / Simulator)    │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │         Phase 1: Failure Classification Agent          │
               │  [insufficient_funds | expired_card | bank_decline...] │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │         Phase 2: Autonomous Orchestrator Agent         │
               │   Evaluates history & playbook ➔ Determines action:    │
               │   • retry_later (2-3 days for funds, 6h for bank)      │
               │   • retry_now (5-15 min for transient network drop)    │
               │   • notify_customer (card update for expired/invalid)  │
               │   • escalate (immediate hold for fraud/risk blocks)    │
               └──────────────┬──────────────────────────┬──────────────┘
                              │                          │
        Action: notify_customer                          Action: retry_later / retry_now
                              │                          │
                              ▼                          ▼
   ┌─────────────────────────────────────┐    ┌───────────────────────────────────┐
   │    Phase 3: Gemini Dunning Agent    │    │    Phase 4: Autonomous Retry      │
   │  Tone modulation by segment:        │    │    Scheduler (APScheduler / Loop) │
   │  • B2C: Warm, friendly, casual      │    │  • Schedules optimal retry window │
   │  • B2B: Formal corporate invoice    │    │  • Polls & executes due retries   │
   │  • Injects secure card-update link  │    │  • Marks recovered or advances    │
   └──────────────────┬──────────────────┘    └─────────────────┬─────────────────┘
                      │                                         │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │  Dual Persistence: Local SQLite DB + Supabase Cloud    │
               │  (transactions, recovery_actions, retry_attempts, msgs)│
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │   Modern React 19 + Tailwind + Recharts Dashboard      │
               │  • Live Stream Controller  • 5-Step Vertical Timeline   │
               │  • Filterable Audit Table  • Gemini Message Inspector  │
               └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, APScheduler, httpx, python-dotenv
- **AI & LLM**: Google Gemini (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-flash-latest`)
- **Database**: SQLite (local zero-config default) + Supabase PostgreSQL (dual-sync enabled)
- **Payment Gateway**: Razorpay (Webhook ingestion, test-mode failure simulation, card-update links)
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons

---

## 🚀 Quick Start & Setup Instructions

### 1. Backend Setup

1. Open your terminal in the `/backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS / Linux:
   # source venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure your `GEMINI_API_KEY` (from [Google AI Studio](https://aistudio.google.com/app/apikey)) and your Razorpay / Supabase keys. Note that `MOCK_MODE=true` is enabled by default for safe hackathon demos.*
5. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - **API Status**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
   - **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup

1. In a second terminal window, navigate to `/frontend`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Defaults to `VITE_API_BASE_URL=http://localhost:8000`)*
4. Launch the Vite dev server:
   ```bash
   npm run dev
   ```
   - Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## ⏱️ 2-Minute Demo Script for Judges

Follow this exact sequence to demonstrate the full end-to-end agentic workflow to judges:

### **Step 1: The Executive Overview (0:00 – 0:25)**
1. Open **[http://localhost:5173](http://localhost:5173)**.
2. **Point out the top 4 KPI cards**:
   - **Revenue at Risk**: Total failed payment volume requiring agent recovery.
   - **Revenue Recovered**: Actual volume recaptured autonomously.
   - **Recovery Rate %**: Historical recovery effectiveness.
   - **Active Retries**: Scheduled recovery attempts queued in the background engine.
3. **Show the Recharts Line Chart**: Explain that this tracks daily autonomous recovery rates over the past 7 days.

### **Step 2: Trigger the Autonomous Live Stream (0:25 – 0:55)**
1. On the Dashboard, scroll to the **Autonomous Recovery Pipeline Streamer** card.
2. Ensure `Events: 5` is selected (or pick 3 / 8).
3. Click **"Run Demo Simulation"**.
4. **What to say while it runs**:
   > *"Watch what happens live: The simulator fires a burst of diverse Razorpay payment failure events across B2B enterprise accounts and B2C individual consumers. The backend ingests the webhook, classifies the root cause, invokes the Orchestration Agent to decide the optimal recovery strategy, and generates personalized Gemini dunning copy in real-time."*
5. Show the resulting **Simulation Stream Complete** card grid showing each transaction's step, customer name, segment badge, classified reason, and agent decision pill (`RETRY LATER`, `NOTIFY CUSTOMER`, `RETRY NOW`, `ESCALATE`).

### **Step 3: The 5-Step Vertical Lifecycle Timeline (0:55 – 1:20)**
1. Click directly on any of the simulated cards (e.g. one with `NOTIFY_CUSTOMER` or `RETRY_LATER`).
2. The **Transaction Details Slide-Over Drawer** opens:
   - **Step 1: Payment Failure Ingestion**: Raw gateway error, transaction ID, and timestamp.
   - **Step 2: AI Root Cause Classification**: Shows the categorized classification (`insufficient_funds`, `expired_card`, etc.) with a **confidence score**.
   - **Step 3: Autonomous Agent Decision**: **Highlight the plain-English Reasoning Box** (emphasize that agent reasoning is front-and-center, never hidden in tooltips!).
   - **Step 4: Recovery Execution**: Displays the dispatched dunning email draft or scheduled retry timestamp.
   - **Step 5: Recovery Outcome**: Current recovery status.
3. Close the drawer using the `Esc` key or the top-right `X` button.

### **Step 4: Filterable Transactions & Audit Trail (1:20 – 1:40)**
1. Click **Transactions** in the left sidebar (`/transactions`).
2. Demonstrate live filtering:
   - Filter by **Classification** (e.g., select `expired_card` or `insufficient_funds`).
   - Filter by **Status** or search by customer name.
3. Click the **Eye icon** on any row to confirm that the full 5-step lifecycle drawer is accessible across the entire platform.

### **Step 5: Gemini Adaptive Tone & Dunning Inspector (1:40 – 1:55)**
1. Click **Messages** in the left sidebar (`/messages`).
2. **Point out the Tone Modulation**:
   - Filter by **B2C**: Notice the friendly, warm, empathetic tone with direct call-to-action link.
   - Filter by **B2B**: Notice the formal, executive tone referencing corporate procurement, subscription invoices, and finance team assistance.
3. Highlight that all messages include the secure `{payment_link}` placeholder and are protected by `MOCK_MODE=true` for safe hackathon presentation.

### **Step 6: Playbook Rules & Autonomous Scheduler (1:55 – 2:10)**
1. Click **Playbook** in the left sidebar (`/playbook`).
2. Explain the decision rule matrix:
   - `insufficient_funds` ➔ Silent retry delayed 2-3 days (aligns with salary windows).
   - `expired_card` ➔ Immediate notification to update card (auto-retries always fail).
   - `bank_decline` ➔ Retry in 6 hours, notify if persistent.
   - `network_error` ➔ Rapid retry in 5–15 minutes.
   - `risk_block` ➔ Escalate to manual ops review, freeze retries.
3. Return to **Dashboard** (`/`) and in the **Scheduled Retries Queue**, click **"Run Due Now"** to show manual trigger of due retries via the scheduler.

---

## 🔒 Security & Environment Credentials

- **Zero Hardcoded Secrets**: All API keys, database credentials, and webhook secrets are loaded dynamically from environment variables via `python-dotenv`.
- **Protected by Default**: Both `/backend/.gitignore` and root `.gitignore` prevent local `.env` and `*.db` files from being committed.
- **Safe Hackathon Mode**: `MOCK_MODE=true` ensures no unsolicited customer communications are dispatched without explicit configuration.
