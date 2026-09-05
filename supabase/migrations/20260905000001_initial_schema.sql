-- ============================================================================
-- Supabase Migration: 20260905000001_initial_schema.sql
-- Description: Core schema for Revenue Recovery AI platform
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table: customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    segment VARCHAR(20) NOT NULL DEFAULT 'b2c' CHECK (segment IN ('b2c', 'b2b')),
    risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_risk_flag ON customers(risk_flag);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_payment_id VARCHAR(100) UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'retrying', 'recovered', 'lost')),
    failure_reason_raw TEXT,
    failure_reason_classified VARCHAR(100),
    confidence_score NUMERIC(5, 4) CHECK (confidence_score >= 0.0000 AND confidence_score <= 1.0000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_razorpay_id ON transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_classified_reason ON transactions(failure_reason_classified);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Table: retry_attempts
CREATE TABLE IF NOT EXISTS retry_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1),
    scheduled_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    outcome VARCHAR(50),
    method VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retry_attempts_transaction_id ON retry_attempts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_scheduled_at ON retry_attempts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_outcome ON retry_attempts(outcome);

-- 4. Table: recovery_actions
CREATE TABLE IF NOT EXISTS recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('retry', 'notify', 'escalate', 'write_off')),
    agent_reasoning TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_transaction_id ON recovery_actions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_action_type ON recovery_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_created_at ON recovery_actions(created_at DESC);

-- 5. Table: recovery_messages
CREATE TABLE IF NOT EXISTS recovery_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_messages_transaction_id ON recovery_messages(transaction_id);
CREATE INDEX IF NOT EXISTS idx_recovery_messages_channel ON recovery_messages(channel);
CREATE INDEX IF NOT EXISTS idx_recovery_messages_sent_at ON recovery_messages(sent_at DESC);

-- Supabase RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retry_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'service_role_all_customers'
    ) THEN
        CREATE POLICY service_role_all_customers ON customers FOR ALL TO service_role USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'service_role_all_transactions'
    ) THEN
        CREATE POLICY service_role_all_transactions ON transactions FOR ALL TO service_role USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'retry_attempts' AND policyname = 'service_role_all_retry_attempts'
    ) THEN
        CREATE POLICY service_role_all_retry_attempts ON retry_attempts FOR ALL TO service_role USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'recovery_actions' AND policyname = 'service_role_all_recovery_actions'
    ) THEN
        CREATE POLICY service_role_all_recovery_actions ON recovery_actions FOR ALL TO service_role USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'recovery_messages' AND policyname = 'service_role_all_recovery_messages'
    ) THEN
        CREATE POLICY service_role_all_recovery_messages ON recovery_messages FOR ALL TO service_role USING (true);
    END IF;
END $$;
