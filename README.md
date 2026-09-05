# Revenue Recovery AI 🚀

An autonomous AI-powered platform for smart dunning, failed payment recovery, and automated customer revenue workflows.

## 🏗️ Architecture & Project Structure

```text
revenue-recovery-ai/
├── backend/
│   ├── routes/              # API endpoints (e.g. health check, webhooks, dunning)
│   ├── services/            # Core business & dunning recovery logic
│   ├── models/              # Pydantic schemas and data models
│   ├── agents/              # Gemini-powered intelligent recovery & negotiation agents
│   ├── db/                  # Supabase / PostgreSQL database session management
│   ├── main.py              # FastAPI entry point & CORS configuration
│   ├── requirements.txt     # Python backend dependencies
│   ├── Dockerfile           # Backend container definition
│   ├── .env.example         # Backend environment variables template
│   └── .env                 # Local backend environment variables (git-ignored)
│
├── frontend/
│   ├── src/
│   │   ├── api/             # API client & backend connection wrappers
│   │   ├── components/      # Modular UI components (Navbar, StatusBadge, Cards)
│   │   ├── hooks/           # Custom React hooks (e.g. useHealthCheck)
│   │   ├── pages/           # Application views (Dashboard, Invoices, Analytics)
│   │   ├── App.tsx          # Main React component
│   │   └── main.tsx         # Application mount
│   ├── package.json         # React + Vite + TailwindCSS dependencies
│   ├── Dockerfile           # Frontend container definition
│   ├── .env.example         # Frontend environment variables template
│   └── .env                 # Local frontend environment variables (git-ignored)
│
├── docker-compose.yml       # Multi-service local deployment orchestration
├── .gitignore               # Root git ignore specification
└── README.md                # Project documentation
```

---

## ⚙️ Environment Variables

### Backend (`/backend/.env.example`)
| Variable | Description |
|---|---|
| `PORT` | FastAPI server port (default: 8000) |
| `HOST` | Server bind host (default: 0.0.0.0) |
| `ENVIRONMENT` | Environment type (`development`, `production`) |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) |
| `RAZORPAY_KEY_ID` | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Signing Secret |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_KEY` | Supabase Service / Anon API Key |
| `GEMINI_API_KEY` | Google Gemini AI API Key |

### Frontend (`/frontend/.env.example`)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of backend API (e.g. `http://localhost:8000`) |

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI dev server:
python -m uvicorn main:app --reload --port 8000
```
- API Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Interactive API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env

# Run Vite dev server:
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🐳 Running with Docker Compose

```bash
docker-compose up --build
```
Both services will start concurrently:
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000)
