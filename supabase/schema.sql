-- TuniBot Supabase Schema
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/<your-project>/sql

create extension if not exists "pgcrypto";

-- ============================================================
-- BUSINESSES
-- ============================================================
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  hours       text,
  phone       text,
  whatsapp    text,
  widget_id   text unique not null default gen_random_uuid()::text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- KNOWLEDGE BASE (one or more rows per business)
-- ============================================================
create table if not exists knowledge_base (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  content     text not null,
  source      text,          -- e.g. 'manual', 'faq.pdf'
  created_at  timestamptz default now()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table if not exists conversations (
  id          uuid primary key,  -- client-generated UUID
  business_id uuid references businesses(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ============================================================
-- MESSAGES (normalized — replaces JSONB history)
-- ============================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz default now()
);

create index if not exists idx_messages_conversation_id
  on messages(conversation_id);

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id),
  name            text,
  phone           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table businesses     enable row level security;
alter table knowledge_base enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table leads          enable row level security;

-- Business owners can only access their own business
create policy "owners_businesses" on businesses
  for all using (auth.uid() = user_id);

-- Knowledge base follows business ownership
create policy "owners_knowledge_base" on knowledge_base
  for all using (
    business_id in (select id from businesses where user_id = auth.uid())
  );

-- Leads follow business ownership
create policy "owners_leads" on leads
  for all using (
    business_id in (select id from businesses where user_id = auth.uid())
  );

-- The API route uses the service role key (bypasses RLS).
-- Block anon reads on widget-facing tables as a security backstop.
create policy "no_anon_conversations" on conversations
  for select using (false);

create policy "no_anon_messages" on messages
  for select using (false);
