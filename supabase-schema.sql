-- Run this in your Supabase SQL editor (Database → SQL Editor)

create table if not exists users (
  clerk_user_id      text primary key,
  email              text,
  stripe_customer_id text,
  plan               text default 'none',        -- 'none' | 'starter' | 'business' | 'byok' | 'expired'
  plan_expires_at    timestamptz,
  entity_limit       int  default 0,             -- entities included in plan
  extra_entities     int  default 0,             -- purchased add-on entities
  seat_limit         int  default 1,             -- -1 = unlimited (Business)
  created_at         timestamptz default now()
);

-- Restrict direct access: only service key can read/write
alter table users enable row level security;

-- No public policies — service role key bypasses RLS

-- ── Migration 2026-07: proxy cost control ──────────────────────────────────────
-- Daily per-user request counter used by api/claude.js (DAILY_REQUEST_CAP).
-- The proxy degrades gracefully (plan gating only, no daily cap) until these run.
alter table users add column if not exists requests_today int default 0;
alter table users add column if not exists requests_date  date;
alter table users add column if not exists trial_analyses_used int default 0;
