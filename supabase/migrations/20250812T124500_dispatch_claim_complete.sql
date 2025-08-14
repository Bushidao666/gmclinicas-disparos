-- Reivindica alvos da fila de campanha (lock pessimista) e retorna dados necessários para envio
create or replace function public.claim_campaign_targets(batch_size integer default 20)
returns table (
  target_id uuid,
  campaign_id uuid,
  client_id uuid,
  lead_id uuid,
  scheduled_at timestamptz,
  phone text,
  content_type text,
  caption_text text,
  media_path text,
  instance_id text,
  instance_base_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select ct.id as target_id
    from public.campaign_targets ct
    where ct.status = 'queued'
      and ct.scheduled_at <= now()
    order by ct.scheduled_at asc
    for update skip locked
    limit batch_size
  ), upd as (
    update public.campaign_targets ct
    set status = 'sending', last_attempt_at = now(), attempt_count = ct.attempt_count + 1
    where ct.id in (select target_id from picked)
    returning ct.*
  )
  select
    u.id as target_id,
    u.campaign_id,
    cp.client_id,
    u.lead_id,
    u.scheduled_at,
    l.whatsapp_e164 as phone,
    cp.content_type,
    cp.caption_text,
    cp.media_path,
    ei.instance_id,
    coalesce(ei.base_url, null) as instance_base_url
  from upd u
  join public.campaigns cp on cp.id = u.campaign_id
  join public.leads l on l.id = u.lead_id
  left join public.evoapi_instances ei on ei.id = cp.evoapi_instance_id;
end;
$$;

-- Marca alvo como enviado + registra mensagem outbound
create or replace function public.complete_target_sent(p_target_id uuid, p_evo_message_id text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target record;
begin
  select ct.*, c.client_id, ct.campaign_id, ct.lead_id into v_target
  from public.campaign_targets ct
  join public.campaigns c on c.id = ct.campaign_id
  where ct.id = p_target_id;

  update public.campaign_targets set status = 'sent' where id = p_target_id;

  insert into public.messages_outbound (client_id, campaign_id, lead_id, evo_message_id, payload_json, status, sent_at)
  values (v_target.client_id, v_target.campaign_id, v_target.lead_id, p_evo_message_id, coalesce(p_payload,'{}'::jsonb), 'sent', now())
  on conflict do nothing;
end;
$$;

-- Marca alvo como falha
create or replace function public.complete_target_failed(p_target_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaign_targets set status = 'failed', error = left(coalesce(p_error,'unknown error'), 500)
  where id = p_target_id;
end;
$$;


