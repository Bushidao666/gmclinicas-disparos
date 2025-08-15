"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { 
  MessageSquare, 
  Send, 
  Phone,
  TrendingUp,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useUserRole } from "@/hooks/useUserRole";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                <TrendingUp className={`w-4 h-4 ${trend.isPositive ? 'text-success' : 'text-danger'}`} />
                <span className={`text-xs ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function ClientDashboard() {
  const supabase = createSupabaseClient();
  const { profile } = useUserRole();
  const clientId = profile?.client?.id;

  // Buscar métricas do cliente
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["client-metrics", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Buscar métricas agregadas
      const [
        campaignsResult,
        messagesResult,
        instancesResult,
        responsesResult,
      ] = await Promise.all([
        // Campanhas
        supabase
          .from("campaigns")
          .select("id, status")
          .eq("client_id", clientId),
        
        // Mensagens
        supabase
          .from("messages_outbound")
          .select("id, status", { count: "exact" })
          .eq("client_id", clientId),
        
        // Instâncias
        supabase
          .from("evoapi_instances")
          .select("id, status")
          .eq("client_id", clientId),
        
        // Respostas
        supabase
          .from("responses")
          .select("id, type")
          .eq("client_id", clientId),
      ]);

      const campaigns = campaignsResult.data || [];
      const instances = instancesResult.data || [];
      const responses = responsesResult.data || [];

      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === "active").length,
        totalMessagesSent: messagesResult.count || 0,
        totalInstances: instances.length,
        connectedInstances: instances.filter(i => i.status === "connected").length,
        totalResponses: responses.length,
        positiveResponses: responses.filter(r => r.type === "positive").length,
        responseRate: messagesResult.count ? 
          Math.round((responses.length / messagesResult.count) * 100) : 0,
      };
    },
    enabled: !!clientId,
  });

  // Buscar campanhas recentes
  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["client-recent-campaigns", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          start_at,
          daily_volume,
          campaign_targets!inner(
            status
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Buscar dados de mensagens dos últimos 7 dias
  const { data: messagesChartData, isLoading: messagesChartLoading } = useQuery({
    queryKey: ["client-messages-chart", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const endDate = new Date();
      const startDate = subDays(endDate, 6);
      
      const { data, error } = await supabase
        .from("messages_outbound")
        .select("id, status, sent_at, created_at")
        .eq("client_id", clientId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      // Agrupar por dia
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData = days.map(day => {
        const dayMessages = data?.filter(msg => {
          const msgDate = new Date(msg.sent_at || msg.created_at);
          return format(msgDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
        }) || [];

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          enviadas: dayMessages.filter(m => m.status === "sent").length,
          falhas: dayMessages.filter(m => m.status === "failed").length,
        };
      });

      return dailyData;
    },
    enabled: !!clientId,
  });

  if (metricsLoading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo, {profile?.client?.name}!</h1>
        <p className="text-muted-foreground">
          Aqui está um resumo das suas campanhas e métricas
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Campanhas Ativas"
          value={`${metrics.activeCampaigns}/${metrics.totalCampaigns}`}
          subtitle="Total de campanhas"
          icon={<Send className="w-5 h-5 text-primary" />}
        />
        
        <MetricCard
          title="Mensagens Enviadas"
          value={metrics.totalMessagesSent.toLocaleString('pt-BR')}
          subtitle="Total acumulado"
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
        />
        
        <MetricCard
          title="Taxa de Resposta"
          value={`${metrics.responseRate}%`}
          subtitle={`${metrics.totalResponses} respostas`}
          icon={<Activity className="w-5 h-5 text-primary" />}
          trend={{
            value: 5.2,
            isPositive: true
          }}
        />
        
        <MetricCard
          title="Números Conectados"
          value={`${metrics.connectedInstances}/${metrics.totalInstances}`}
          subtitle="WhatsApp ativos"
          icon={<Phone className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Gráfico de Mensagens dos Últimos 7 Dias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mensagens dos Últimos 7 Dias</h2>
            <a 
              href="/client-dashboard/reports" 
              className="text-sm text-primary hover:underline"
            >
              Ver relatório completo
            </a>
          </div>
        </CardHeader>
        <CardBody>
          {messagesChartLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : messagesChartData && messagesChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={messagesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="enviadas" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Enviadas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="falhas" 
                    stroke="#FF8042" 
                    strokeWidth={2}
                    name="Falhas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem enviada nos últimos 7 dias
            </div>
          )}
        </CardBody>
      </Card>

      {/* Campanhas Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Campanhas Recentes</h2>
            <a 
              href="/client-dashboard/campaigns" 
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </a>
          </div>
        </CardHeader>
        <CardBody>
          {campaignsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentCampaigns && recentCampaigns.length > 0 ? (
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div 
                  key={campaign.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Início: {format(new Date(campaign.start_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${campaign.status === 'active' ? 'bg-success/20 text-success' : 
                        campaign.status === 'completed' ? 'bg-primary/20 text-primary' :
                        campaign.status === 'paused' ? 'bg-warning/20 text-warning' :
                        'bg-default/20 text-default'
                      }`}
                    >
                      {campaign.status === 'active' ? 'Ativa' :
                       campaign.status === 'completed' ? 'Concluída' :
                       campaign.status === 'paused' ? 'Pausada' :
                       campaign.status === 'draft' ? 'Rascunho' : 
                       'Cancelada'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {campaign.daily_volume} msgs/dia
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha encontrada
            </div>
          )}
        </CardBody>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardBody>
            <a href="/client-dashboard/instances" className="block">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Gerenciar Números</p>
                  <p className="text-sm text-muted-foreground">
                    Conecte ou gerencie seus números WhatsApp
                  </p>
                </div>
              </div>
            </a>
          </CardBody>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardBody>
            <a href="/client-dashboard/reports" className="block">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Ver Relatórios</p>
                  <p className="text-sm text-muted-foreground">
                    Análise detalhada das suas campanhas
                  </p>
                </div>
              </div>
            </a>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}