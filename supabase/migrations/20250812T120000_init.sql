-- Init core schema, extensions, types, tables, indexes, security helpers, and RLS

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Types
do $$ begin
  if not exists (select 1 from pg_type where typname = 'response_type') then
    create type response_type as enum ('unsubscribe', 'positive', 'other');
  end if;
end $$;

-- Core tables
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_members (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','operator')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_clients_agency on public.clients(agency_id);

create table if not exists public.evoapi_instances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  base_url text not null,
  instance_id text not null,
  api_key text not null,
  name text,
  status text not null default 'unknown' check (status in ('connected','disconnected','unknown')),
  max_msgs_per_minute integer not null default 20 check (max_msgs_per_minute > 0),
  last_connected_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evoapi_instances_client on public.evoapi_instances(client_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text,
  whatsapp_e164 text not null,
  tags text[] not null default '{}',
  is_opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, whatsapp_e164)
);
create index if not exists idx_leads_client on public.leads(client_id);
create index if not exists idx_leads_whatsapp on public.leads(whatsapp_e164);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  start_at timestamptz not null,
  daily_volume integer not null check (daily_volume > 0),
  target_count integer,
  content_type text not null default 'text' check (content_type in ('text','image','video','audio','document')),
  caption_text text,
  media_path text,
  evoapi_instance_id uuid references public.evoapi_instances(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed','canceled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_campaigns_client on public.campaigns(client_id);
create index if not exists idx_campaigns_start_status on public.campaigns(start_at, status);

create table if not exists public.campaign_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','canceled')),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index if not exists idx_campaign_targets_sched_status on public.campaign_targets(scheduled_at, status);

create table if not exists public.messages_outbound (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  evo_message_id text,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_messages_outbound_client_evo_msg on public.messages_outbound(client_id, evo_message_id) where evo_message_id is not null;
create index if not exists idx_messages_outbound_client on public.messages_outbound(client_id);
create index if not exists idx_messages_outbound_sent_at on public.messages_outbound(sent_at);

create table if not exists public.messages_inbound (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  text_content text,
  payload_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index if not exists idx_messages_inbound_client on public.messages_inbound(client_id);
create index if not exists idx_messages_inbound_received_at on public.messages_inbound(received_at);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  type response_type not null,
  detected_by text not null check (detected_by in ('webhook','manual')),
  matched_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_responses_client on public.responses(client_id);
create index if not exists idx_responses_created_at on public.responses(created_at);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  evoapi_instance_id uuid references public.evoapi_instances(id) on delete set null,
  event_type text not null,
  raw_json jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  received_at timestamptz not null default now()
);
create index if not exists idx_webhook_events_client on public.webhook_events(client_id);
create index if not exists idx_webhook_events_received_at on public.webhook_events(received_at);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','canceled','no_show','done')),
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_appointments_client on public.appointments(client_id);
create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);

-- Views (mínimas)
create or replace view public.v_campaign_metrics as
select
  c.id as campaign_id,
  c.client_id,
  count(ct.*) filter (where ct.status = 'sent') as sent_count,
  count(ct.*) filter (where ct.status = 'failed') as failed_count,
  count(mi.*) as inbound_count,
  count(r.*) filter (where r.type = 'unsubscribe') as unsubscribe_count
from public.campaigns c
left join public.campaign_targets ct on ct.campaign_id = c.id
left join public.messages_inbound mi on mi.client_id = c.client_id and mi.received_at >= c.start_at
left join public.responses r on r.client_id = c.client_id and r.created_at >= c.start_at
group by c.id, c.client_id;

create or replace view public.v_client_metrics as
with days as (
  select generate_series(date_trunc('day', now()) - interval '30 days', date_trunc('day', now()), interval '1 day')::date as day
)
select
  cl.id as client_id,
  d.day,
  coalesce((select count(*) from public.messages_outbound mo where mo.client_id = cl.id and mo.status = 'sent' and mo.sent_at::date = d.day), 0) as outbound_sent,
  coalesce((select count(*) from public.messages_inbound mi where mi.client_id = cl.id and mi.received_at::date = d.day), 0) as inbound_received,
  coalesce((select count(*) from public.responses r where r.client_id = cl.id and r.type = 'unsubscribe' and r.created_at::date = d.day), 0) as unsubscribes
from public.clients cl
cross join days d;

-- Security helpers
create or replace function public.is_member_of_agency(target_agency_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  return exists (
    select 1 from public.agency_members am
    where am.agency_id = target_agency_id
      and am.user_id = auth.uid()
  );
end;
$$;

create or replace function public.get_client_agency_id(target_client_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select c.agency_id from public.clients c where c.id = target_client_id;
$$;

create or replace function public.is_member_of_client(target_client_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select public.is_member_of_agency(public.get_client_agency_id(target_client_id));
$$;

create or replace function public.is_member_of_campaign(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select public.is_member_of_client((select c.client_id from public.campaigns c where c.id = target_campaign_id));
$$;

-- Trigger: adicionar automaticamente owner em agency_members
create or replace function public.on_agency_insert_add_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_members(agency_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_agencies_after_insert on public.agencies;
create trigger trg_agencies_after_insert
after insert on public.agencies
for each row execute function public.on_agency_insert_add_owner();

-- RLS
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.clients enable row level security;
alter table public.evoapi_instances enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_targets enable row level security;
alter table public.messages_outbound enable row level security;
alter table public.messages_inbound enable row level security;
alter table public.responses enable row level security;
alter table public.webhook_events enable row level security;
alter table public.appointments enable row level security;

-- Agencies policies
drop policy if exists "agencies_select" on public.agencies;
create policy "agencies_select" on public.agencies
for select using (public.is_member_of_agency(id));

drop policy if exists "agencies_insert" on public.agencies;
create policy "agencies_insert" on public.agencies
for insert with check (owner_user_id = auth.uid());

drop policy if exists "agencies_modify" on public.agencies;
create policy "agencies_modify" on public.agencies
for all using (public.is_member_of_agency(id)) with check (public.is_member_of_agency(id));

-- Agency members policies
drop policy if exists "agency_members_select" on public.agency_members;
create policy "agency_members_select" on public.agency_members
for select using (public.is_member_of_agency(agency_id));

drop policy if exists "agency_members_modify" on public.agency_members;
create policy "agency_members_modify" on public.agency_members
for all using (public.is_member_of_agency(agency_id)) with check (public.is_member_of_agency(agency_id));

-- Clients
drop policy if exists "clients_all" on public.clients;
create policy "clients_all" on public.clients
for all using (public.is_member_of_agency(agency_id)) with check (public.is_member_of_agency(agency_id));

-- EvoAPI instances
drop policy if exists "evo_instances_all" on public.evoapi_instances;
create policy "evo_instances_all" on public.evoapi_instances
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Leads
drop policy if exists "leads_all" on public.leads;
create policy "leads_all" on public.leads
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Campaigns
drop policy if exists "campaigns_all" on public.campaigns;
create policy "campaigns_all" on public.campaigns
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Campaign targets
drop policy if exists "campaign_targets_all" on public.campaign_targets;
create policy "campaign_targets_all" on public.campaign_targets
for all using (public.is_member_of_campaign(campaign_id)) with check (public.is_member_of_campaign(campaign_id));

-- Messages outbound
drop policy if exists "messages_outbound_all" on public.messages_outbound;
create policy "messages_outbound_all" on public.messages_outbound
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Messages inbound
drop policy if exists "messages_inbound_all" on public.messages_inbound;
create policy "messages_inbound_all" on public.messages_inbound
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Responses
drop policy if exists "responses_all" on public.responses;
create policy "responses_all" on public.responses
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Webhook events
drop policy if exists "webhook_events_all" on public.webhook_events;
create policy "webhook_events_all" on public.webhook_events
for all using (client_id is null or public.is_member_of_client(client_id)) with check (client_id is null or public.is_member_of_client(client_id));

-- Appointments
drop policy if exists "appointments_all" on public.appointments;
create policy "appointments_all" on public.appointments
for all using (public.is_member_of_client(client_id)) with check (public.is_member_of_client(client_id));

-- Storage bucket
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', false)
    on conflict (id) do nothing;
  end if;
end $$;


