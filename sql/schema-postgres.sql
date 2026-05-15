-- ============================================================================
-- Whale Intelligence Dashboard — Optional Postgres schema
-- ============================================================================
-- This file is NOT applied automatically. The default app uses browser
-- localStorage for persistence so the deploy stays zero-config and Vercel-
-- friendly without database hosting.
--
-- Apply only if you outgrow localStorage (multi-device sync, multi-user, etc):
--
--   psql "$DATABASE_URL" -f sql/schema-postgres.sql
--
-- The frontend hooks would then need to be swapped from localStorage to
-- fetch() against new backend routes that read/write these tables. That work
-- is out of scope for the demo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS watchlist_item (
    id            SERIAL PRIMARY KEY,
    symbol        TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    coingecko_id  TEXT NOT NULL,
    image         TEXT,
    target_price  NUMERIC(20, 8),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_item_symbol ON watchlist_item(symbol);

CREATE TABLE IF NOT EXISTS alert (
    id            SERIAL PRIMARY KEY,
    type          TEXT NOT NULL,
    severity      TEXT NOT NULL,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    token_symbol  TEXT,
    exchange      TEXT,
    value_usd     NUMERIC(20, 2),
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    source        TEXT NOT NULL DEFAULT 'system',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_created_at ON alert(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_is_read    ON alert(is_read);
CREATE INDEX IF NOT EXISTS idx_alert_severity   ON alert(severity);

CREATE TABLE IF NOT EXISTS alert_rule (
    id                              SERIAL PRIMARY KEY,
    name                            TEXT NOT NULL,
    type                            TEXT NOT NULL,
    enabled                         BOOLEAN NOT NULL DEFAULT TRUE,
    min_whale_value_usd             NUMERIC(20, 2) NOT NULL DEFAULT 1000000,
    stablecoin_deviation_threshold  NUMERIC(8, 5) NOT NULL DEFAULT 0.005,
    selected_tokens_json            TEXT NOT NULL DEFAULT '[]',
    selected_exchanges_json         TEXT NOT NULL DEFAULT '[]',
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report (
    id                   SERIAL PRIMARY KEY,
    title                TEXT NOT NULL,
    content_markdown     TEXT NOT NULL,
    content_json         JSONB NOT NULL,
    data_source_summary  JSONB NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_created_at ON report(created_at DESC);

CREATE TABLE IF NOT EXISTS app_setting (
    id          SERIAL PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_health_log (
    id          SERIAL PRIMARY KEY,
    provider    TEXT NOT NULL,
    status      TEXT NOT NULL,
    latency_ms  INTEGER NOT NULL,
    message     TEXT,
    checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_health_log_provider_checked
    ON api_health_log(provider, checked_at DESC);
