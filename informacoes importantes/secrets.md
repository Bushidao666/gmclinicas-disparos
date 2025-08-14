Vou validar o estado do banco no projeto Supabase (tabelas principais) e gerar os tipos TypeScript. Se as tabelas existirem, aplico a constraint de unicidade em `evoapi_instances.instance_id`. Em paralelo, listo as Edge Functions para confirmar o status.
Ran tool
Ran tool
Ran tool
Ran tool

Status: backend está pronto. Faltam apenas configurações operacionais no projeto Supabase (secrets, verify_jwt, scheduler, webhook Evo e policies do Storage). Abaixo deixo um checklist enxuto, com valores prontos de `@Dados Importantes.md` e comandos/SQL prontos para colar.

### Secrets do projeto (Functions → Settings → Secrets)
- SUPABASE_URL: https://wganmokbuymaihgafdbk.supabase.co
- SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYW5tb2tidXltYWloZ2FmZGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzA4NzcsImV4cCI6MjA3MDUwNjg3N30.dv1pXBk6S5bggShgbxBN00B64zj6yDC4k5mStvk9hMM
- SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYW5tb2tidXltYWloZ2FmZGJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzMDg3NywiZXhwIjoyMDcwNTA2ODc3fQ.otJ52QhgaV3A7LFJJsk9Mkn066prdfmpJuDc3Ewd6RA
- EVO_BASE_URL: https://api.automacoesgm.com.br/manager/
- EVO_API_KEY: 9b88621fa3434ce9186072b88cea0695
- EVO_WEBHOOK_SECRET: pT9QfT2dL6yZ3hR0nV1wM8sJ4bK7xE5g

### Verify JWT (Functions → [cada função] → Settings)
- Desativar verify_jwt: `evo-webhook`, `dispatcher`
- Manter verify_jwt: `upload-leads`, `create-campaign`, `sync-evo-instances`

### Scheduler (Functions → Scheduler)
- Agendar `dispatcher` a cada 1 minuto:
  - Método: POST
  - URL: https://wganmokbuymaihgafdbk.functions.supabase.co/dispatcher
  - Headers: nenhum (com verify_jwt desativado)

### Webhook na Evolution Manager
- URL: https://wganmokbuymaihgafdbk.functions.supabase.co/evo-webhook
- Header: x-webhook-secret: <EVO_WEBHOOK_SECRET>
- Referência da sua Evo Manager: [Evolution Manager API](https://api.automacoesgm.com.br/manager/)

### Storage policies (rodar no SQL Editor do Supabase)
- Observação: a criação via migração falhou por ownership do schema `storage`. No SQL Editor (como owner), rode:
```sql
alter table if exists storage.objects enable row level security;

drop policy if exists "media_insert_auth" on storage.objects;
create policy "media_insert_auth" on storage.objects
for insert to authenticated
with check (bucket_id = 'media');

drop policy if exists "media_update_owner" on storage.objects;
create policy "media_update_owner" on storage.objects
for update to authenticated
using (bucket_id = 'media' and owner = auth.uid())
with check (bucket_id = 'media' and owner = auth.uid());

drop policy if exists "media_delete_owner" on storage.objects;
create policy "media_delete_owner" on storage.objects
for delete to authenticated
using (bucket_id = 'media' and owner = auth.uid());
```

### Unicidade de instance_id (recomendado, rodar no SQL Editor)
```sql
create unique index if not exists uq_evoapi_instances_instance
  on public.evoapi_instances(instance_id);
```

### Testes rápidos (após configurar acima)
- Webhook (simulação):
```bash
curl -X POST https://wganmokbuymaihgafdbk.functions.supabase.co/evo-webhook \
 -H "x-webhook-secret: <EVO_WEBHOOK_SECRET>" \
 -H "Content-Type: application/json" \
 -d '{"from":"+5511900000000","message":"eu quero","instanceId":"<instanceId_da_Evo>"}'
```
- Dispatcher (manual, além do Scheduler):
```bash
curl -X POST https://wganmokbuymaihgafdbk.functions.supabase.co/dispatcher
```

Se preferir, posso:
- Executar os SQLs via SQL Editor agora (você confirma que tenho permissão/owner).
- Validar o Scheduler e o verify_jwt no painel.
- Criar um “check de saúde” das instâncias no banco e um endpoint de “pause/resume” de campanha.

- Pronto para front após: secrets, verify_jwt, scheduler, webhook e policies.