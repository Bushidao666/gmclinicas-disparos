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
import { Link } from "@heroui/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
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
  "#1B4D95", // Yale Blue - Cor primária
  "#2675d9", // Yale Blue Light
  "#424141", // Arsenic
  "#00b96f", // Success
  "#ffb800", // Warning
  "#ff4d4d", // Danger Light
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
      { name: "Enviadas", value: generalMetrics?.messagesSent || 0, color: "#1B4D95" },
      { name: "Falhadas", value: generalMetrics?.messagesFailed || 0, color: "#ff4d4d" },
      { name: "Na fila", value: generalMetrics?.messagesQueued || 0, color: "#424141" },
    ];
    return data.filter((d) => d.value > 0);
  }, [generalMetrics]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50/20 via-background to-primary-100/10 dark:from-primary-900/10 dark:via-background dark:to-primary-800/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Header com Glass Effect */}
        <div className="glass-subtle rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-lg shadow-success/50"></div>
                  <span className="text-sm text-arsenic-400 dark:text-arsenic-300">Atualização em tempo real</span>
                </div>
                <span className="text-xs text-arsenic-300 dark:text-arsenic-400">|  Visão geral do sistema</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="glass-input rounded-xl px-4 py-2 backdrop-blur-md">
                <label className="text-xs text-arsenic-400 dark:text-arsenic-300 block mb-1 font-medium">Período</label>
                <DatePicker
                  className="bg-transparent text-foreground text-sm outline-none w-full"
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  selectsRange
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
                  isClearable
                  placeholderText="Selecione o período"
                />
              </div>
              <div className="glass-input rounded-xl px-4 py-2 backdrop-blur-md min-w-[200px]">
                <label className="text-xs text-arsenic-400 dark:text-arsenic-300 block mb-1 font-medium">Cliente</label>
                <Select
                  className="w-full"
                  placeholder="Todos os clientes"
                  selectedKeys={selectedClientId ? [selectedClientId] : []}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  classNames={{
                    trigger: "bg-transparent border-0 data-[hover=true]:bg-white/10",
                    value: "text-foreground",
                    popoverContent: "glass-card",
                  }}
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
          </div>
        </div>

        {/* Cards de métricas com Glass Effect */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-animation">
          <Card className="glass-card glass-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <p className="text-sm text-arsenic-400 dark:text-arsenic-300 font-medium">Total de Campanhas</p>
                <div className="glass-subtle p-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardBody className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gm-black dark:text-white value-important">
                    {generalMetrics?.totalCampaigns ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-sm text-success font-medium">
                      {generalMetrics?.activeCampaigns ?? 0} ativas
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 shimmer"></div>
              </div>
            </CardBody>
          </Card>

          <Card className="glass-card glass-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <p className="text-sm text-arsenic-400 dark:text-arsenic-300 font-medium">Total de Leads</p>
                <div className="glass-subtle p-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardBody className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gm-black dark:text-white value-important">
                    {generalMetrics?.totalLeads ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm text-success font-medium">
                      {generalMetrics?.activeLeads ?? 0} ativos
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 shimmer"></div>
              </div>
            </CardBody>
          </Card>

          <Card className="glass-card glass-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <p className="text-sm text-arsenic-400 dark:text-arsenic-300 font-medium">Mensagens Enviadas</p>
                <div className="glass-subtle p-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardBody className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gm-black dark:text-white value-important">
                    {generalMetrics?.messagesSent ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    <span className="text-sm text-danger font-medium">
                      {generalMetrics?.messagesFailed ?? 0} falhadas
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 shimmer"></div>
              </div>
            </CardBody>
          </Card>

          <Card className="glass-card glass-hover group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <p className="text-sm text-arsenic-400 dark:text-arsenic-300 font-medium">Mensagens Recebidas</p>
                <div className="glass-subtle p-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardBody className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gm-black dark:text-white value-important">
                    {generalMetrics?.totalResponses ?? 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-2 w-16 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all duration-1000"
                        style={{ width: `${generalMetrics?.successRate || 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-arsenic-500 dark:text-arsenic-400 font-medium">
                      {generalMetrics?.successRate}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary/10 shimmer"></div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Gráficos com Glass Effect */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de área - Mensagens por dia */}
          <Card className="glass-card glass-hover overflow-hidden">
            <CardHeader className="glass-subtle border-b border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gm-black dark:text-white flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  Mensagens por Dia
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-xs text-arsenic-400">Enviadas</span>
                  <div className="w-2 h-2 bg-danger rounded-full ml-2"></div>
                  <span className="text-xs text-arsenic-400">Falhadas</span>
                </div>
              </div>
            </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <AreaChart data={dailyMessages} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4D95" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1B4D95" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d4d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ff4d4d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="enviadas" stroke="#1B4D95" fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="falhadas" stroke="#ff4d4d" fillOpacity={1} fill="url(#colorFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Gráfico de pizza - Distribuição de mensagens */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="border-b border-default-100">
            <h3 className="text-lg font-semibold text-gm-black dark:text-white">Distribuição de Mensagens</h3>
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

        {/* Tabelas com Glass Effect */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Campanhas recentes */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="glass-subtle border-b border-white/10 backdrop-blur-sm">
              <div className="flex justify-between w-full items-center">
                <h3 className="text-lg font-semibold text-gm-black dark:text-white flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  Campanhas Recentes
                </h3>
                <Button 
                  as={Link} 
                  href="/campaigns" 
                  size="sm" 
                  className="glass-button text-primary hover:text-white hover:bg-primary/20"
                >
                  Ver todas →
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table 
                removeWrapper 
                aria-label="Campanhas recentes"
                classNames={{
                  base: "bg-transparent",
                  table: "min-h-[200px]",
                  thead: "[&>tr]:first:shadow-none",
                  tbody: "[&>tr]:hover:glass-subtle [&>tr]:transition-all",
                  tr: "hover:bg-white/5 dark:hover:bg-white/5",
                  td: "py-3 text-sm",
                  th: "bg-transparent text-arsenic-400 font-medium text-xs uppercase tracking-wider"
                }}
              >
                <TableHeader>
                  <TableColumn>Nome</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>Criação</TableColumn>
                </TableHeader>
                <TableBody emptyContent="Nenhuma campanha encontrada" items={recentCampaigns || []}>
                  {(item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Chip 
                          color={item.status === "active" ? "success" : "default"} 
                          size="sm" 
                          variant="flat"
                          className="glass-subtle"
                          startContent={<div className={`w-2 h-2 rounded-full ${item.status === "active" ? "bg-success animate-pulse" : "bg-default-400"}`} />}
                        >
                          {item.status === "active" ? "Ativa" : item.status}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-arsenic-400">{new Date(item.created_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardBody>
        </Card>

          {/* Leads recentes */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="glass-subtle border-b border-white/10 backdrop-blur-sm">
              <div className="flex justify-between w-full items-center">
                <h3 className="text-lg font-semibold text-gm-black dark:text-white flex items-center gap-2">
                  <div className="w-1 h-4 bg-success rounded-full"></div>
                  Leads Recentes
                </h3>
                <Button 
                  as={Link} 
                  href="/leads" 
                  size="sm" 
                  className="glass-button text-success hover:text-white hover:bg-success/20"
                >
                  Ver todos →
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table 
                removeWrapper 
                aria-label="Leads recentes"
                classNames={{
                  base: "bg-transparent",
                  table: "min-h-[200px]",
                  thead: "[&>tr]:first:shadow-none",
                  tbody: "[&>tr]:hover:glass-subtle [&>tr]:transition-all",
                  tr: "hover:bg-white/5 dark:hover:bg-white/5",
                  td: "py-3 text-sm",
                  th: "bg-transparent text-arsenic-400 font-medium text-xs uppercase tracking-wider"
                }}
              >
                <TableHeader>
                  <TableColumn>Nome</TableColumn>
                  <TableColumn>Telefone</TableColumn>
                  <TableColumn>Status</TableColumn>
                </TableHeader>
                <TableBody emptyContent="Nenhum lead encontrado" items={recentLeads || []}>
                  {(item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-arsenic-400">{item.phone}</TableCell>
                      <TableCell>
                        <Chip 
                          color={!item.is_opted_out ? "success" : "default"} 
                          size="sm" 
                          variant="flat"
                          className="glass-subtle"
                          startContent={<div className={`w-2 h-2 rounded-full ${!item.is_opted_out ? "bg-success animate-pulse" : "bg-default-400"}`} />}
                        >
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
      </div>
    </main>
  );
}

