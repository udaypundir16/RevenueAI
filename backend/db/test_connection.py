import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Reconfigure stdout for UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Load .env
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

from sqlalchemy import text
from db.connection import (
    engine,
    SessionLocal,
    is_supabase_configured,
    get_supabase_client,
    SUPABASE_URL,
    SUPABASE_KEY,
    DATABASE_URL,
)

def run_connection_test():
    print("=" * 70)
    print("REVENUE RECOVERY AI - DATABASE CONNECTION DIAGNOSTIC")
    print("=" * 70)

    # 1. Environment Variables Inspection
    print("\n[1] Checking Environment Credentials:")
    print(f"  - SUPABASE_URL:     {SUPABASE_URL if SUPABASE_URL else '(Not provided / blank)'}")
    print(f"  - SUPABASE_KEY:     {'[SET]' if SUPABASE_KEY else '(Not provided / blank)'}")
    print(f"  - DATABASE_URL:     {DATABASE_URL if DATABASE_URL else '(Not provided / using fallback)'}")

    # 2. Supabase Client Verification
    print("\n[2] Testing Supabase Client Connection:")
    if is_supabase_configured():
        try:
            client = get_supabase_client()
            if client:
                print("  [OK] Supabase client initialized successfully.")
                try:
                    res = client.table("customers").select("id").limit(1).execute()
                    print(f"  [OK] Query to 'customers' table succeeded! (Returned {len(res.data)} rows)")
                except Exception as query_err:
                    print(f"  [WARN] Client connected, but query on 'customers' returned: {query_err}")
                    print("         (Tip: Make sure you ran 001_initial_schema.sql in Supabase SQL Editor)")
            else:
                print("  [ERROR] Supabase client failed to initialize.")
        except Exception as e:
            print(f"  [ERROR] Supabase client connection error: {e}")
    else:
        print("  [INFO] Supabase URL/Key is not set yet in backend/.env.")
        print("         To connect to your live Supabase project:")
        print("         1. Open backend/.env")
        print("         2. Set SUPABASE_URL=https://<your-project-id>.supabase.co")
        print("         3. Set SUPABASE_KEY=<your-anon-or-service-role-key>")
        print("         4. Set DATABASE_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres")

    # 3. SQLAlchemy Database Connection Verification
    print("\n[3] Testing SQLAlchemy Engine Connection:")
    try:
        with engine.connect() as conn:
            # Execute universal ping test
            result = conn.execute(text("SELECT 1 AS alive")).fetchone()
            dialect_name = engine.dialect.name
            print(f"  [OK] SQLAlchemy engine successfully connected!")
            print(f"  - Database Dialect: {dialect_name}")
            print(f"  - Ping Test Result: SELECT 1 => {result[0]}")

            if dialect_name == "postgresql":
                info = conn.execute(
                    text("SELECT current_database(), current_user, version();")
                ).fetchone()
                print(f"  - Connected DB:     {info[0]}")
                print(f"  - DB User:          {info[1]}")
                print(f"  - PostgreSQL Ver:   {info[2].split()[0]} {info[2].split()[1]}")

                # Check if tables exist
                tables = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('customers', 'transactions', 'retry_attempts', 'recovery_actions', 'recovery_messages')
                    ORDER BY table_name;
                """)).fetchall()
                found_tables = [t[0] for t in tables]
                print(f"  - Detected Schema Tables ({len(found_tables)}/5): {found_tables}")
                if len(found_tables) < 5:
                    print("  [WARN] Not all 5 tables were detected in the public schema.")
                    print("         Run the migration: backend/db/migrations/001_initial_schema.sql")
                else:
                    print("  [OK] All 5 revenue-recovery tables exist in PostgreSQL!")
            else:
                print(f"  [INFO] Active connection target: {engine.url}")
    except Exception as e:
        print(f"  [ERROR] SQLAlchemy connection error: {e}")

    # 4. Session ORM Transaction Test
    print("\n[4] Testing SessionLocal Transaction:")
    try:
        session = SessionLocal()
        test_val = session.execute(text("SELECT 42 AS answer")).scalar()
        print(f"  [OK] ORM Session opened and query executed successfully (Result: {test_val})")
        session.close()
    except Exception as e:
        print(f"  [ERROR] ORM Session error: {e}")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    run_connection_test()
