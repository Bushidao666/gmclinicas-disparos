"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell 
} from "@heroui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Play, Pause, X } from "lucide-react";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'canceled';
  start_at: string;
  daily_volume: number;
  target_count: number | null;
  created_at: string;
  client: {
    id: string;
    name: string;
  };
  instance: {
    id: string;
    name: string;
  } | null;
  stats: {
    total_targets: number;
    sent_count: number;
  };
}

const statusColorMap = {
  draft: "default",
  active: "success",
  paused: "warning",
  completed: "primary",
  canceled: "danger",
} as const;

const statusLabelMap = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  canceled: "Cancelada",
};

export default function CampaignsPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();

  async function handleAction(
    campaignId: string,
    action: "pause" | "resume" | "cancel",
  ) {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Falha ao ${action} campanha`);
      }
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? e.message
          : `Não foi possível executar a ação: ${action}`,
      );
    }
  }

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      // Buscar campanhas
      const { data: base, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          start_at,
          daily_volume,
          target_count,
          created_at,
          client:clients!campaigns_client_id_fkey(id, name),
          instance:evoapi_instances!campaigns_evoapi_instance_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar métricas agregadas por campanha via view (evita N+1)
      const { data: metrics } = await supabase
        .from("v_campaign_metrics")
        .select("campaign_id, total_targets, sent_count");

      const metricsById = new Map(
        (metrics || []).map((m) => [m.campaign_id, m])
      );

      const campaignsWithStats: Campaign[] = (base || []).map((c: any): Campaign => {
        const m = metricsById.get(c.id);
        const total = m?.total_targets ?? 0;
        const sent = m?.sent_count ?? 0;

        const clientRel = Array.isArray(c.client) ? c.client[0] : c.client;
        const instanceRel = Array.isArray(c.instance) ? (c.instance[0] ?? null) : (c.instance ?? null);

        return {
          id: String(c.id),
          name: String(c.name),
          status: c.status as Campaign["status"],
          start_at: String(c.start_at),
          daily_volume: Number(c.daily_volume),
          target_count: c.target_count == null ? null : Number(c.target_count),
          created_at: String(c.created_at),
          client: clientRel as { id: string; name: string },
          instance: instanceRel ? (instanceRel as { id: string; name: string }) : null,
          stats: {
            total_targets: typeof total === "number" ? total : Number(total),
            sent_count: typeof sent === "number" ? sent : Number(sent),
          },
        };
      });

      return campaignsWithStats;
    },
  });

  // Realtime: invalidar ao mudar campanhas/targets (progresso)
  useRealtimeSubscription({
    channel: "campaigns-realtime",
    table: "campaigns",
    onChange: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
  useRealtimeSubscription({
    channel: "campaign-targets-realtime",
    table: "campaign_targets",
    onChange: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const getProgress = (campaign: Campaign) => {
    if (campaign.stats.total_targets === 0) return 0;
    return Math.round((campaign.stats.sent_count / campaign.stats.total_targets) * 100);
  };

  const renderCell = (campaign: Campaign, columnKey: React.Key) => {
    switch (columnKey) {
      case "name":
        return (
          <div>
            <p className="font-medium">{campaign.name}</p>
            <p className="text-xs text-gray-500">{campaign.client.name}</p>
          </div>
        );
      
      case "status":
        return (
          <Chip
            className="capitalize"
            color={statusColorMap[campaign.status]}
            size="sm"
            variant="flat"
          >
            {statusLabelMap[campaign.status]}
          </Chip>
        );
      
      case "progress":
        const progress = getProgress(campaign);
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-primary">{campaign.stats.sent_count}</span>
                <span className="text-arsenic-400">{campaign.stats.total_targets}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-success/10 to-success/5 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-success to-success-600 rounded-full h-full transition-all duration-500 relative"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-success">{progress}%</span>
            </div>
          </div>
        );
      
      case "schedule":
        return (
          <div>
            <p className="text-sm">
              {format(new Date(campaign.start_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-gray-500">
              {campaign.daily_volume} msgs/dia
            </p>
          </div>
        );
      
      case "actions":
        return (
          <div className="flex gap-1">
            {campaign.status === "active" && (
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={() => handleAction(campaign.id, "pause")}
                title="Pausar campanha"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            {campaign.status === "paused" && (
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="success"
                onPress={() => handleAction(campaign.id, "resume")}
                title="Retomar campanha"
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
            {(campaign.status === "active" || campaign.status === "paused") && (
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="danger"
                onPress={() => {
                  if (
                    confirm(
                      "Tem certeza que deseja cancelar esta campanha? Os envios pendentes serão cancelados.",
                    )
                  ) {
                    handleAction(campaign.id, "cancel");
                  }
                }}
                title="Cancelar campanha"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {(campaign.status === "draft" || campaign.status === "canceled") && (
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="danger"
                onPress={async () => {
                  if (confirm("Excluir permanentemente esta campanha?")) {
                    await handleAction(campaign.id, "cancel");
                    // Depois do cancel (noDraft ignora), chamar delete
                    try {
                      const res = await fetch(`/api/campaigns/${campaign.id}/delete`, {
                        method: "POST",
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || "Erro ao excluir");
                      }
                      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Falha ao excluir campanha");
                    }
                  }
                }}
                title="Excluir campanha"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <main className="p-6 space-y-6">
      {/* Header com glass effect */}
      <div className="glass-card rounded-2xl p-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gm-black dark:text-white">Campanhas</h1>
            <p className="text-arsenic-500 dark:text-arsenic-300 mt-1">
              Gerencie suas campanhas de disparos WhatsApp
            </p>
          </div>
          <Button
            color="primary"
            size="lg"
            startContent={<Plus className="w-5 h-5" />}
            onPress={() => router.push("/campaigns/create")}
            className="bg-gradient-to-r from-primary to-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Nova Campanha
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 animate-slideInLeft">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Spinner size="lg" color="primary" />
              <p className="text-arsenic-500 mt-4">Carregando campanhas...</p>
            </div>
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <Table 
            aria-label="Tabela de campanhas"
            classNames={{
              wrapper: "bg-transparent",
              th: "bg-primary/10 text-primary font-semibold uppercase text-xs",
              td: "text-arsenic-500 dark:text-arsenic-300"
            }}
          >
            <TableHeader>
              <TableColumn key="name">CAMPANHA</TableColumn>
              <TableColumn key="status">STATUS</TableColumn>
              <TableColumn key="progress">PROGRESSO</TableColumn>
              <TableColumn key="schedule">AGENDAMENTO</TableColumn>
              <TableColumn key="actions">AÇÕES</TableColumn>
            </TableHeader>
              <TableBody items={campaigns}>
                {(campaign) => (
                  <TableRow key={campaign.id}>
                    {(columnKey) => (
                      <TableCell>{renderCell(campaign, columnKey)}</TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                <Plus className="w-12 h-12 text-primary" />
              </div>
              <p className="text-arsenic-500 dark:text-arsenic-300 mb-4 text-lg">
                Nenhuma campanha encontrada
              </p>
              <p className="text-arsenic-400 mb-6 text-sm">
                Crie sua primeira campanha e comece a enviar mensagens
              </p>
              <Button
                color="primary"
                size="lg"
                onPress={() => router.push("/campaigns/create")}
                className="bg-gradient-to-r from-primary to-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                startContent={<Plus className="w-5 h-5" />}
              >
                Criar Primeira Campanha
              </Button>
            </div>
          )}
      </div>
    </main>
  );
}