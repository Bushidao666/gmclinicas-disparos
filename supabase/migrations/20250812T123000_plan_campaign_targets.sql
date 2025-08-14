-- Gera campaign_targets distribuindo por dia conforme daily_volume, a partir de start_at
create or replace function public.plan_campaign_targets(target_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_daily integer;
  v_target integer;
  v_client uuid;
  v_inserted integer;
begin
  select c.start_at, c.daily_volume, coalesce(c.target_count, 1000000000), c.client_id
    into v_start, v_daily, v_target, v_client
  from public.campaigns c
  where c.id = target_campaign_id
  for update;

  if v_start is null then
    raise exception 'Campaign % not found', target_campaign_id;
  end if;

  with selected as (
    select l.id as lead_id,
           row_number() over (order by l.created_at) as rn
    from public.leads l
    where l.client_id = v_client
      and l.is_opted_out = false
    limit v_target
  ), prepared as (
    select
      s.lead_id,
      (v_start + make_interval(days => floor((s.rn - 1) / v_daily))) as scheduled_at
    from selected s
  )
  insert into public.campaign_targets (campaign_id, lead_id, scheduled_at)
  select target_campaign_id, p.lead_id, p.scheduled_at from prepared p
  on conflict (campaign_id, lead_id) do nothing;

  get diagnostics v_inserted = ROW_COUNT;
  return v_inserted;
end;
$$;


