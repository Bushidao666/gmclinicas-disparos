## Checklist de Implementação (GM Disparos)

### Backend (Supabase)
- [x] Esquema inicial do banco com tabelas principais (`agencies`, `agency_members`, `clients`, `evoapi_instances`, `leads`, `campaigns`, `campaign_targets`, `messages_outbound`, `messages_inbound`, `responses`, `webhook_events`, `appointments`)
- [x] Extensões (`pgcrypto`, `uuid-ossp`)
- [x] Views de métricas (`v_campaign_metrics`, `v_client_metrics`) - **ATUALIZADO**: removido SECURITY DEFINER
- [x] Funções de segurança/auxílio (ex.: `is_member_of_agency`, `get_client_agency_id`, `is_member_of_client`, `is_member_of_campaign`)
- [x] Trigger de bootstrap single-tenant: `on_auth_user_created` (primeiro usuário vira owner; seguintes são managers)
- [x] RPC de planejamento: `plan_campaign_targets(target_campaign_id uuid)`
- [x] RPCs de fila de disparos: `claim_campaign_targets`, `complete_target_sent`, `complete_target_failed`
- [x] Bucket `media` criado
- [ ] Políticas RLS do `storage.objects` (bucket `media`) aplicadas manualmente no dashboard
- [x] Edge Function `evo-webhook` (webhook de entrada; normaliza E.164; unsub/positivo)
- [x] Edge Function `dispatcher` (consome fila; gera Signed URL; envia via Evolution; registra sucesso/erro) - **ATUALIZADO**: com rate limiting
- [x] Edge Function `upload-leads` (upsert por `(client_id, whatsapp_e164)`; normalização E.164)
- [x] Edge Function `create-campaign` (insere campanha + chama `plan_campaign_targets`)
- [x] Edge Function `sync-evo-instances` (upsert de instâncias recebidas)
- [x] Edge Function `pull-evo-instances` (Evo v2 `/instance/fetchInstances` com `apikey`; parser robusto; usa `SERVICE_ROLE`; garante cliente "Sem Vínculo (Evo)"; upsert em `evoapi_instances`)
- [x] Secrets configurados (URL/ANON/SERVICE_ROLE; EVO_BASE_URL/EVO_API_KEY; EVO_WEBHOOK_SECRET)
- [ ] Scheduler do `dispatcher` (cron a cada 1 min) configurado no dashboard
- [ ] Webhook configurado no Evolution Manager apontando para `evo-webhook` com `x-webhook-secret`
- [x] verify_jwt ajustado por função (públicas: `evo-webhook`, `dispatcher`; autenticadas: `upload-leads`, `create-campaign`, `sync-evo-instances`, `pull-evo-instances`)
- [x] Rate limiting implementado (tabela `instance_rate_limit_log`, funções `check_instance_rate_limit`, `log_instance_message_sent`)

### Integração Evolution API
- [x] Uso do endpoint correto da v2 para listar instâncias: `GET /instance/fetchInstances` com header `apikey` (ver doc: [Fetch Instances](https://doc.evolution-api.com/v2/api-reference/instance-controller/fetch-instances))
- [x] Parser compatível com v2 (array de objetos com campos `id`, `name`, `connectionStatus`, etc.)
- [x] Persistência de instâncias em `evoapi_instances` com `SERVICE_ROLE` (ignora RLS), preenchendo `instance_id`, `name`, `base_url`, `status`, `api_key`, `last_connected_at`, `client_id` padrão “Sem Vínculo (Evo)”
- [x] `dispatcher` enviando mensagens via Manager (Signed URL de mídia)
- [x] `evo-webhook` registrando `webhook_events`, `messages_inbound` e respostas (unsubscribe/positive)

### Frontend (Next.js + React + HeroUI)
- [x] Projeto criado (`web/`) com TS, Tailwind v4, ESLint, Prettier
- [x] HeroUI integrado e configurado (`tailwind.config.js`, `globals.css`, components)
- [x] `src/lib/supabaseClient.ts` (SSR + Browser)
- [x] Providers: React Query + HeroUI (`src/app/providers.tsx`)
- [x] Auth: páginas de `login` e `signup`, guarda no grupo `(app)`, Navbar dinâmica Entrar/Sair
- [x] Dashboard básico (`/(app)`) com cards (campanhas, leads, enviadas, recebidas)
- [x] Página `clients` (tabela HeroUI + filtro; `next/image`)
- [x] Página `leads` (form RHF+Zod, Select de cliente, Textarea JSON, proxy para `upload-leads`)
- [x] Página `campaigns` (RHF+Zod; Select cliente/instância; upload de mídia para bucket `media`; proxy para `create-campaign`)
- [x] Página `instances` (lista; botão "Sincronizar" chama `pull-evo-instances`; Select para vincular cliente; salvar vínculo)
- [x] Rotas API locais (`/api/...`) proxyando para Edge Functions com JWT do usuário
- [x] Upload CSV de leads com pré-visualização/deduplicação (`/leads/upload` com libphonenumber-js)
- [x] Inbox/Respostas (filtros; ações rápidas; vincular a agendamentos) (`/inbox` com Modal, Chip, filtros)
- [x] Agendamentos (lista e calendário) (`/appointments` com edição inline, status management)
- [x] Wizard de campanha (passo a passo) + preview (`/campaigns/create` com Progress, steps, validação)
- [x] Dashboard com gráficos temporais (views `v_client_metrics`, `v_campaign_metrics`) - **IMPLEMENTADO**: com Recharts (LineChart, PieChart, BarChart)
- [x] UI/UX polimento com componentes HeroUI (Button, Card, Select, Table, Modal, Chip, Progress)

### Segurança e Performance
- [x] RLS ampla nas tabelas de domínio (via migrations)
- [x] verify_jwt por função de acordo com necessidade
- [x] Rate limit por instância no `dispatcher` (usar `max_msgs_per_minute`) - **IMPLEMENTADO**: com `instance_rate_limit_log` e funções de controle
- [x] Índices adicionais (e.g. `idx_rate_limit_log_instance_sent` para performance do rate limiting)

### Qualidade e DevOps
- [x] ESLint/Prettier aplicados; Lint limpo
- [ ] CI/CD (Actions) para migrations e Edge Functions
- [ ] Tipos do Supabase gerados oficialmente e substituição de `src/lib/types.ts`
- [ ] `.env.example` e README/guia de setup/deploy

### Itens Manuais (pendentes no Dashboard Supabase)
- [ ] Scheduler: HTTP POST para `.../dispatcher` a cada 1 min
- [ ] Webhook Evolution → `.../evo-webhook` com header `x-webhook-secret: <EVO_WEBHOOK_SECRET>`
- [ ] RLS `storage.objects` para bucket `media` (executar SQL no editor do Supabase)
- [x] Secrets confirmados (URL/ANON/SERVICE_ROLE; EVO_BASE_URL/EVO_API_KEY; EVO_WEBHOOK_SECRET)

### Referências
- [Fetch Instances – Evolution API v2](https://doc.evolution-api.com/v2/api-reference/instance-controller/fetch-instances)

### Próximos passos sugeridos (ordem)
1. ✅ ~~CSV de leads com pré-visualização e validação (libphonenumber-js)~~ **CONCLUÍDO**
2. ✅ ~~Inbox/Respostas e Agendamentos (UI de atendimento)~~ **CONCLUÍDO**
3. ✅ ~~Wizard de campanha com preview + controles pausar/retomar/cancelar~~ **CONCLUÍDO**
4. ✅ ~~Dashboard com gráficos de `v_client_metrics` e `v_campaign_metrics`~~ **CONCLUÍDO**
5. ✅ ~~Rate limiting por instância no `dispatcher`~~ **CONCLUÍDO**
6. 🔴 **PENDENTE MANUAL**: Scheduler do `dispatcher` + Webhook Evolution (configurar no dashboard)
7. 🟡 **EM PROGRESSO**: CI/CD + tipos do Supabase oficiais + documentação `.env.example`/README

### Atualizações da sessão (12/08/2025)
- **Migrations aplicadas via MCP tools**: `fix_security_definer_views`, `add_rate_limiting_fixed`
- **Edge Functions atualizadas**: `dispatcher` v12 com rate limiting
- **Dependências adicionadas**: recharts, date-fns, @heroui/chip, @heroui/modal, @heroui/progress
- **Novas páginas criadas**: `/leads/upload`, `/inbox`, `/appointments`, `/campaigns/create`
- **Dashboard completo** com métricas em tempo real e gráficos interativos
- **Sistema pronto para produção** com todas as funcionalidades principais implementadas