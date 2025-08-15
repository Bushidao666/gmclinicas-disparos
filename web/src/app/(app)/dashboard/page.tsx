"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Progress } from "@heroui/progress";
import { Link } from "@heroui/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
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
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";
// Invalidações de realtime são centralizadas no QueryInvalidationProvider

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    subDays(new Date(), 7),
    new Date(),
  ]);
  const [startDate, endDate] = dateRange;
  const [refreshInterval] = useState(0); // desativado - realtime cobre

  // Métricas gerais usando as novas views
  const { data: generalMetrics } = useQuery({
    queryKey: [
      "dashboard-general-metrics",
      selectedClientId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      // Buscar métricas agregadas do período
      const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : format(subDays(new Date(), 7), "yyyy-MM-dd");
      const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

      let metricsQuery = supabase
        .from("v_dashboard_metrics")
        .select("*")
        .gte("date", startDateStr)
        .lte("date", endDateStr);

      if (selectedClientId) {
        metricsQuery = metricsQuery.eq("client_id", selectedClientId);
      }

      const { data: metrics } = await metricsQuery;

      // Agregar métricas do período
      const aggregated =
        metrics?.reduce(
          (acc, curr) => ({
            messagesSent: acc.messagesSent + curr.messages_sent,
            messagesFailed: acc.messagesFailed + curr.messages_failed,
            messagesQueued: acc.messagesQueued + curr.messages_queued,
            totalMessages: acc.totalMessages + curr.messages_total,
            totalResponses: acc.totalResponses + curr.responses_total,
            positiveResponses: acc.positiveResponses + curr.responses_positive,
            unsubscribes: acc.unsubscribes + curr.responses_unsubscribe,
            appointments: acc.appointments + curr.appointments_total,
            appointmentsConfirmed:
              acc.appointmentsConfirmed + curr.appointments_confirmed,
          }),
          {
            messagesSent: 0,
            messagesFailed: 0,
            messagesQueued: 0,
            totalMessages: 0,
            totalResponses: 0,
            positiveResponses: 0,
            unsubscribes: 0,
            appointments: 0,
            appointmentsConfirmed: 0,
          },
        ) || {};

      // Buscar contagens exatas (evitar limite de 1000 linhas)
      let campaignsCountQuery = supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true });
      let activeCampaignsCountQuery = supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      let leadsCountQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true });
      let activeLeadsCountQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("is_opted_out", false);

      if (selectedClientId) {
        campaignsCountQuery = campaignsCountQuery.eq("client_id", selectedClientId);
        activeCampaignsCountQuery = activeCampaignsCountQuery.eq("client_id", selectedClientId);
        leadsCountQuery = leadsCountQuery.eq("client_id", selectedClientId);
        activeLeadsCountQuery = activeLeadsCountQuery.eq("client_id", selectedClientId);
      }

      const [
        { count: totalCampaigns = 0 } = {},
        { count: activeCampaigns = 0 } = {},
        { count: totalLeads = 0 } = {},
        { count: activeLeads = 0 } = {},
      ] = await Promise.all([
        campaignsCountQuery,
        activeCampaignsCountQuery,
        leadsCountQuery,
        activeLeadsCountQuery,
      ]);

      return {
        totalCampaigns,
        activeCampaigns,
        totalLeads,
        activeLeads,
        ...aggregated,
        successRate:
          aggregated.totalMessages > 0
            ? (
                (aggregated.messagesSent / aggregated.totalMessages) *
                100
              ).toFixed(1)
            : "0",
        responseRate:
          aggregated.messagesSent > 0
            ? (
                (aggregated.totalResponses / aggregated.messagesSent) *
                100
              ).toFixed(1)
            : "0",
        conversionRate:
          aggregated.positiveResponses > 0
            ? (
                (aggregated.appointments / aggregated.positiveResponses) *
                100
              ).toFixed(1)
            : "0",
      };
    },
    refetchInterval: refreshInterval || undefined,
  });

  // Dados para gráfico usando a nova view
  const { data: dailyMessages } = useQuery({
    queryKey: [
      "dashboard-daily-messages",
      selectedClientId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const startDateStr2 = format(startDate, "yyyy-MM-dd");
      const endDateStr2 = format(endDate, "yyyy-MM-dd");

      let query = supabase
        .from("v_dashboard_metrics")
        .select(
          "date, messages_sent, messages_failed, messages_queued, messages_total, responses_total",
        )
        .gte("date", startDateStr2)
        .lte("date", endDateStr2)
        .order("date");

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;

      // Agrupar por data se houver múltiplos clientes
      const grouped =
        data?.reduce(
          (acc, curr) => {
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
          },
          {} as Record<string, any>,
        ) || {};

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

      return (
        data?.map((client) => ({
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
        })) ?? []
      );
    },
  });

  // Campanhas recentes
  const { data: recentCampaigns } = useQuery({
    queryKey: ["dashboard-recent-campaigns", selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("id, name, status, created_at, client_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Realtime: invalidado via QueryInvalidationProvider

  // Leads recentes
  const { data: recentLeads } = useQuery({
    queryKey: ["dashboard-recent-leads", selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, phone, is_opted_out, created_at, client_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Métricas derivadas
  const pieData = useMemo(() => {
    const data = [
      { name: "Enviadas", value: generalMetrics?.messagesSent || 0, color: "#00C49F" },
      { name: "Falhadas", value: generalMetrics?.messagesFailed || 0, color: "#FF8042" },
      { name: "Na fila", value: generalMetrics?.messagesQueued || 0, color: "#8884D8" },
    ];
    return data.filter((d) => d.value > 0);
  }, [generalMetrics]);

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Período:</span>
            <DatePicker
              className="px-3 py-2 rounded-medium bg-content1 text-foreground text-sm border border-default-200"
              dateFormat="dd/MM/yyyy"
              locale={ptBR}
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
              isClearable
            />
          </div>
          <Select
            className="w-48"
            label="Cliente"
            placeholder="Todos"
            selectedKeys={selectedClientId ? [selectedClientId] : []}
            onChange={(e) => setSelectedClientId(e.target.value)}
            items={Array.isArray(clients) ? [
              { id: "", name: "Todos os clientes" },
              ...clients,
            ] : [
              { id: "", name: "Todos os clientes" },
              ...((clients as any)?.items ?? []),
            ]}
          >
            {(item) => (
              <SelectItem key={item.id}>
                {item.name}
              </SelectItem>
            )}
          </Select>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Total de Campanhas</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {generalMetrics?.totalCampaigns ?? 0}
            </p>
            <p className="text-sm text-green-600">
              {generalMetrics?.activeCampaigns ?? 0} ativas
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Total de Leads</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {generalMetrics?.totalLeads ?? 0}
            </p>
            <p className="text-sm text-green-600">
              {generalMetrics?.activeLeads ?? 0} ativos
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Mensagens Enviadas</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {generalMetrics?.messagesSent ?? 0}
            </p>
            <p className="text-sm text-red-600">
              {generalMetrics?.messagesFailed ?? 0} falhadas
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Mensagens Recebidas</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {generalMetrics?.totalResponses ?? 0}
            </p>
            <p className="text-sm text-default-500">
              Taxa de sucesso: {generalMetrics?.successRate}%
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de área - Mensagens por dia */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Mensagens por Dia</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <AreaChart data={dailyMessages} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#FF8042" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="enviadas" stroke="#00C49F" fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="falhadas" stroke="#FF8042" fillOpacity={1} fill="url(#colorFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Gráfico de pizza - Distribuição de mensagens */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Distribuição de Mensagens</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={pieData}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                  labelLine={false}
                  outerRadius={80}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campanhas recentes */}
        <Card>
          <CardHeader>
            <div className="flex justify-between w-full items-center">
              <h3 className="text-lg font-semibold">Campanhas Recentes</h3>
              <Button as={Link} href="/campaigns" size="sm" variant="bordered">Ver todas</Button>
            </div>
          </CardHeader>
          <CardBody>
            <Table removeWrapper aria-label="Campanhas recentes">
              <TableHeader>
                <TableColumn>Nome</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Criação</TableColumn>
              </TableHeader>
              <TableBody emptyContent="Nenhuma campanha encontrada" items={recentCampaigns || []}>
                {(item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Chip color={item.status === "active" ? "success" : "default"} size="sm" variant="flat">
                        {item.status === "active" ? "Ativa" : item.status}
                      </Chip>
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Leads recentes */}
        <Card>
          <CardHeader>
            <div className="flex justify-between w-full items-center">
              <h3 className="text-lg font-semibold">Leads Recentes</h3>
              <Button as={Link} href="/leads" size="sm" variant="bordered">Ver todos</Button>
            </div>
          </CardHeader>
          <CardBody>
            <Table removeWrapper aria-label="Leads recentes">
              <TableHeader>
                <TableColumn>Nome</TableColumn>
                <TableColumn>Telefone</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody emptyContent="Nenhum lead encontrado" items={recentLeads || []}>
                {(item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell>
                      <Chip color={!item.is_opted_out ? "success" : "default"} size="sm" variant="flat">
                        {!item.is_opted_out ? "Ativo" : "Descadastrado"}
                      </Chip>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

