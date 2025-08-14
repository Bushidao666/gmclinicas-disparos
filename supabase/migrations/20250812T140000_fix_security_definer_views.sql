-- Remove SECURITY DEFINER das views de métricas para resolver problemas de segurança
-- As views devem respeitar as políticas RLS do usuário que está consultando

-- Recriar view v_client_metrics sem SECURITY DEFINER
drop view if exists public.v_client_metrics cascade;
create or replace view public.v_client_metrics as
select 
  c.id as client_id,
  c.name as client_name,
  c.agency_id,
  count(distinct l.id) as total_leads,
  count(distinct l.id) filter (where l.is_opted_out = true) as opted_out_leads,
  count(distinct camp.id) as total_campaigns,
  count(distinct mo.id) as messages_sent,
  count(distinct mi.id) as messages_received,
  count(distinct r.id) filter (where r.type = 'positive') as positive_responses,
  count(distinct r.id) filter (where r.type = 'unsubscribe') as unsubscribe_responses,
  count(distinct a.id) as total_appointments
from clients c
left join leads l on l.client_id = c.id
left join campaigns camp on camp.client_id = c.id
left join messages_outbound mo on mo.client_id = c.id
left join messages_inbound mi on mi.client_id = c.id
left join responses r on r.client_id = c.id
left join appointments a on a.client_id = c.id
group by c.id, c.name, c.agency_id;

-- Recriar view v_campaign_metrics sem SECURITY DEFINER
drop view if exists public.v_campaign_metrics cascade;
create or replace view public.v_campaign_metrics as
select 
  camp.id as campaign_id,
  camp.name as campaign_name,
  camp.client_id,
  camp.status,
  camp.start_at,
  camp.daily_volume,
  camp.target_count,
  count(distinct ct.id) as total_targets,
  count(distinct ct.id) filter (where ct.status = 'queued') as queued_targets,
  count(distinct ct.id) filter (where ct.status = 'sent') as sent_targets,
  count(distinct ct.id) filter (where ct.status = 'failed') as failed_targets,
  count(distinct mo.id) as messages_sent,
  count(distinct r.id) filter (where r.type = 'positive') as positive_responses,
  count(distinct r.id) filter (where r.type = 'unsubscribe') as unsubscribe_responses,
  round(
    case when count(distinct ct.id) filter (where ct.status = 'sent') > 0
    then (count(distinct r.id)::numeric / count(distinct ct.id) filter (where ct.status = 'sent')::numeric) * 100
    else 0 end, 2
  ) as response_rate
from campaigns camp
left join campaign_targets ct on ct.campaign_id = camp.id
left join messages_outbound mo on mo.campaign_id = camp.id
left join responses r on r.client_id = camp.client_id 
  and r.created_at >= camp.start_at
group by camp.id, camp.name, camp.client_id, camp.status, camp.start_at, camp.daily_volume, camp.target_count;

-- Adicionar comentários explicativos
comment on view public.v_client_metrics is 'Métricas agregadas por cliente - respeita RLS do usuário consultante';
comment on view public.v_campaign_metrics is 'Métricas agregadas por campanha - respeita RLS do usuário consultante';