"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Progress } from "@heroui/progress";
import { Link } from "@heroui/link";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    subDays(new Date(), 7),
    new Date()
  ]);
  const [startDate, endDate] = dateRange;
  const [refreshInterval] = useState(30000); // 30 segundos

  // Métricas gerais usando as novas views
  const { data: generalMetrics } = useQuery({
    queryKey: ["dashboard-general-metrics", selectedClientId, startDate, endDate],
    queryFn: async () => {
      // Buscar métricas agregadas do período
      let metricsQuery = supabase
        .from("v_dashboard_metrics")
        .select("*")
        .gte("date", startDate?.toISOString() || subDays(new Date(), 7).toISOString())
        .lte("date", endDate?.toISOString() || new Date().toISOString());

      if (selectedClientId) {
        metricsQuery = metricsQuery.eq("client_id", selectedClientId);
      }

      const { data: metrics } = await metricsQuery;

      // Agregar métricas do período
      const aggregated = metrics?.reduce((acc, curr) => ({
        messagesSent: acc.messagesSent + curr.messages_sent,
        messagesFailed: acc.messagesFailed + curr.messages_failed,
        messagesQueued: acc.messagesQueued + curr.messages_queued,
        totalMessages: acc.totalMessages + curr.messages_total,
        totalResponses: acc.totalResponses + curr.responses_total,
        positiveResponses: acc.positiveResponses + curr.responses_positive,
        unsubscribes: acc.unsubscribes + curr.responses_unsubscribe,
        appointments: acc.appointments + curr.appointments_total,
        appointmentsConfirmed: acc.appointmentsConfirmed + curr.appointments_confirmed,
      }), {
        messagesSent: 0,
        messagesFailed: 0,
        messagesQueued: 0,
        totalMessages: 0,
        totalResponses: 0,
        positiveResponses: 0,
        unsubscribes: 0,
        appointments: 0,
        appointmentsConfirmed: 0,
      }) || {};

      // Buscar dados complementares
      let campaignsQuery = supabase.from("campaigns").select("*");
      let leadsQuery = supabase.from("leads").select("*");

      if (selectedClientId) {
        campaignsQuery = campaignsQuery.eq("client_id", selectedClientId);
        leadsQuery = leadsQuery.eq("client_id", selectedClientId);
      }

      const [campaigns, leads] = await Promise.all([campaignsQuery, leadsQuery]);

      return {
        totalCampaigns: campaigns.data?.length ?? 0,
        activeCampaigns: campaigns.data?.filter(c => c.status === "active").length ?? 0,
        totalLeads: leads.data?.length ?? 0,
        activeLeads: leads.data?.filter(l => !l.is_opted_out).length ?? 0,
        ...aggregated,
        successRate: aggregated.totalMessages > 0 
          ? (aggregated.messagesSent / aggregated.totalMessages * 100).toFixed(1)
          : "0",
        responseRate: aggregated.messagesSent > 0
          ? (aggregated.totalResponses / aggregated.messagesSent * 100).toFixed(1)
          : "0",
        conversionRate: aggregated.positiveResponses > 0
          ? (aggregated.appointments / aggregated.positiveResponses * 100).toFixed(1)
          : "0",
      };
    },
    refetchInterval: refreshInterval,
  });

  // Dados para gráfico usando a nova view
  const { data: dailyMessages } = useQuery({
    queryKey: ["dashboard-daily-messages", selectedClientId, startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      let query = supabase
        .from("v_dashboard_metrics")
        .select("date, messages_sent, messages_failed, messages_queued, messages_total, responses_total")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date");

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;

      // Agrupar por data se houver múltiplos clientes
      const grouped = data?.reduce((acc, curr) => {
        const dateKey = format(parseISO(curr.date), "dd/MM");
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            enviadas: 0,
            falhadas: 0,
            naFila: 0,
            respostas: 0,
          };
        }
        acc[dateKey].enviadas += curr.messages_sent;
        acc[dateKey].falhadas += curr.messages_failed;
        acc[dateKey].naFila += curr.messages_queued;
        acc[dateKey].respostas += curr.responses_total;
        return acc;
      }, {} as Record<string, any>) || {};

      return Object.values(grouped);
    },
  });

  // Performance por cliente usando a nova view
  const { data: clientPerformance } = useQuery({
    queryKey: ["dashboard-client-performance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("v_client_performance")
        .select("*")
        .order("engagement_score", { ascending: false })
        .limit(10);

      return data?.map(client => ({
        client_name: client.client_name,
        client_id: client.client_id,
        total_messages: client.total_messages || 0,
        sent: client.messages_sent || 0,
        failed: client.messages_failed || 0,
        success_rate: client.success_rate || "0",
        response_rate: client.response_rate || "0",
        conversion_rate: client.conversion_rate || "0",
        engagement_score: client.engagement_score || 0,
        volume_rank: client.volume_rank || 0,
        response_rank: client.response_rank || 0,
      })) || [];
    },
  });

  // Top campanhas usando a nova view em tempo real
  const { data: topCampaigns } = useQuery({
    queryKey: ["dashboard-top-campaigns", selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from("v_campaign_realtime_metrics")
        .select("*")
        .order("sent_count", { ascending: false })
        .limit(10);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;
      
      return data?.map(c => ({
        name: c.campaign_name,
        status: c.status,
        instance: c.instance_name || "Sem instância",
        total: c.total_targets || 0,
        sent: c.sent_count || 0,
        failed: c.failed_count || 0,
        queued: c.queued_count || 0,
        sending: c.sending_count || 0,
        responses: c.response_count || 0,
        positive: c.positive_responses || 0,
        unsubscribe: c.unsubscribe_count || 0,
        appointments: c.appointments_created || 0,
        successRate: c.total_targets > 0 
          ? ((c.sent_count || 0) / c.total_targets * 100).toFixed(1)
          : "0",
        responseRate: c.sent_count > 0 
          ? ((c.response_count || 0) / c.sent_count * 100).toFixed(1)
          : "0",
        progress: c.progress_percentage || 0,
        velocity: c.msgs_per_hour || 0,
        eta: c.estimated_hours_remaining || null,
      })) ?? [];
    },
    refetchInterval: refreshInterval,
  });

  // Funil de conversão
  const funnelData = useMemo(() => {
    if (!generalMetrics) return [];
    
    return [
      { name: "Mensagens Enviadas", value: generalMetrics.messagesSent, fill: "#0088FE" },
      { name: "Mensagens Recebidas", value: generalMetrics.totalResponses, fill: "#00C49F" },
      { name: "Respostas Positivas", value: generalMetrics.positiveResponses, fill: "#FFBB28" },
      { name: "Agendamentos", value: generalMetrics.appointments, fill: "#FF8042" },
    ];
  }, [generalMetrics]);

  // Distribuição de status
  const statusDistribution = useMemo(() => {
    if (!generalMetrics) return [];
    
    return [
      { name: "Enviadas", value: generalMetrics.messagesSent, fill: "#00C49F" },
      { name: "Falhadas", value: generalMetrics.messagesFailed, fill: "#FF8042" },
      { name: "Na Fila", value: generalMetrics.messagesQueued, fill: "#FFBB28" },
    ].filter(item => item.value > 0);
  }, [generalMetrics]);

  return (
    <main className="p-6 space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Dashboard de Disparos</h1>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-gray-600 mb-1 block">Período</label>
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update as [Date | null, Date | null])}
              dateFormat="dd/MM/yyyy"
              locale={ptBR}
              className="w-full px-3 py-2 border rounded-lg"
              placeholderText="Selecione o período"
            />
          </div>
          
          <div className="min-w-[200px]">
            <label className="text-sm text-gray-600 mb-1 block">Cliente</label>
            <Select
              placeholder="Todos os clientes"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <SelectItem key="" value="">Todos os clientes</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button color="primary" variant="flat">
              Exportar CSV
            </Button>
            <Button color="primary" variant="flat">
              Gerar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Taxa de Sucesso</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-green-600">{generalMetrics?.successRate}%</p>
            <Progress 
              value={Number(generalMetrics?.successRate || 0)} 
              color="success"
              className="mt-2"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Taxa de Resposta</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-blue-600">{generalMetrics?.responseRate}%</p>
            <Progress 
              value={Number(generalMetrics?.responseRate || 0)} 
              color="primary"
              className="mt-2"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Total de Mensagens</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">{generalMetrics?.totalMessages || 0}</p>
            <div className="flex gap-2 mt-2">
              <Chip size="sm" color="success">{generalMetrics?.messagesSent} enviadas</Chip>
              <Chip size="sm" color="danger">{generalMetrics?.messagesFailed} falhas</Chip>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Conversões</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">{generalMetrics?.appointments || 0}</p>
            <p className="text-sm text-gray-600">
              De {generalMetrics?.positiveResponses || 0} interessados
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de área - Evolução temporal */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Evolução de Envios</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyMessages}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF8042" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="enviadas"
                  stroke="#00C49F"
                  fillOpacity={1}
                  fill="url(#colorSent)"
                />
                <Area
                  type="monotone"
                  dataKey="falhadas"
                  stroke="#FF8042"
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Funil de conversão */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Funil de Conversão</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Distribuição de Status</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Performance por Cliente com Score de Engajamento */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Top Clientes - Score de Engajamento</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="client_name" type="category" width={150} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border rounded shadow">
                          <p className="font-semibold">{data.client_name}</p>
                          <p className="text-sm">Score: {data.engagement_score}%</p>
                          <p className="text-sm">Taxa Sucesso: {data.success_rate}%</p>
                          <p className="text-sm">Taxa Resposta: {data.response_rate}%</p>
                          <p className="text-sm">Taxa Conversão: {data.conversion_rate}%</p>
                          <p className="text-sm text-gray-500">Rank Volume: #{data.volume_rank}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="engagement_score" fill="#8884D8" name="Score de Engajamento" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Tabela de campanhas em tempo real */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Campanhas em Tempo Real</h3>
            <div className="flex items-center gap-2">
              <Chip size="sm" color="success" variant="dot">Ao vivo</Chip>
              <Button size="sm" variant="light" as={Link} href="/campaigns">Ver todas</Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Tabela de campanhas em tempo real">
            <TableHeader>
              <TableColumn>CAMPANHA</TableColumn>
              <TableColumn>INSTÂNCIA</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn align="center">PROGRESSO</TableColumn>
              <TableColumn align="center">VELOCIDADE</TableColumn>
              <TableColumn align="center">SUCESSO</TableColumn>
              <TableColumn align="center">RESPOSTA</TableColumn>
              <TableColumn align="center">CONVERSÃO</TableColumn>
              <TableColumn align="center">ETA</TableColumn>
            </TableHeader>
            <TableBody>
              {topCampaigns?.map((campaign, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-gray-500">
                        {campaign.sent}/{campaign.total} enviadas
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{campaign.instance}</p>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="sm" 
                      color={
                        campaign.status === "active" ? "success" : 
                        campaign.status === "completed" ? "primary" : 
                        campaign.status === "paused" ? "warning" :
                        "default"
                      }
                      variant={campaign.status === "active" ? "dot" : "flat"}
                    >
                      {campaign.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="w-full">
                      <Progress 
                        value={campaign.progress} 
                        size="sm"
                        color={campaign.progress >= 100 ? "success" : "primary"}
                        className="max-w-md"
                      />
                      <p className="text-xs text-center mt-1">{campaign.progress.toFixed(0)}%</p>
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <p className="text-sm font-medium">{campaign.velocity.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">msgs/h</p>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="sm" color={Number(campaign.successRate) > 80 ? "success" : "warning"}>
                      {campaign.successRate}%
                    </Chip>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="sm" color={Number(campaign.responseRate) > 5 ? "success" : "default"}>
                      {campaign.responseRate}%
                    </Chip>
                  </TableCell>
                  <TableCell align="center">
                    {campaign.appointments > 0 ? (
                      <div>
                        <p className="text-sm font-medium">{campaign.appointments}</p>
                        <p className="text-xs text-gray-500">agendamentos</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {campaign.eta && campaign.status === "active" ? (
                      <p className="text-sm">{campaign.eta}h</p>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </main>
  );
}