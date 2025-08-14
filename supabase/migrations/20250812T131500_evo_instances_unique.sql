-- Garante unicidade de instance_id de Evo Manager por projeto
create unique index if not exists uq_evoapi_instances_instance
  on public.evoapi_instances(instance_id);


