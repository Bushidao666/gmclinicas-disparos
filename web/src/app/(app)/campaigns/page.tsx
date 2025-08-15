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

      const campaignsWithStats = (base || []).map((c) => {
        const m = metricsById.get(c.id);
        const total = m?.total_targets ?? 0;
        const sent = m?.sent_count ?? 0;
        return {
          ...c,
          stats: {
            total_targets: typeof total === 'number' ? total : Number(total),
            sent_count: typeof sent === 'number' ? sent : Number(sent),
          },
        };
      });

      return campaignsWithStats as Campaign[];
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
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>{campaign.stats.sent_count}</span>
                <span>{campaign.stats.total_targets}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium">{progress}%</span>
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
              <Button isIconOnly size="sm" variant="flat">
                <Pause className="w-4 h-4" />
              </Button>
            )}
            {campaign.status === "paused" && (
              <Button isIconOnly size="sm" variant="flat" color="success">
                <Play className="w-4 h-4" />
              </Button>
            )}
            {(campaign.status === "active" || campaign.status === "paused") && (
              <Button isIconOnly size="sm" variant="flat" color="danger">
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Campanhas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas campanhas de disparos
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => router.push("/campaigns/create")}
        >
          Nova Campanha
        </Button>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table aria-label="Tabela de campanhas">
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
              <p className="text-gray-600 mb-4">
                Nenhuma campanha encontrada
              </p>
              <Button
                color="primary"
                onPress={() => router.push("/campaigns/create")}
              >
                Criar Primeira Campanha
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}