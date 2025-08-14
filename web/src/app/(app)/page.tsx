"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [dateRange, setDateRange] = useState("7");

  // Métricas gerais
  const { data: generalMetrics } = useQuery({
    queryKey: ["dashboard-general-metrics", selectedClientId],
    queryFn: async () => {
      let campaignsQuery = supabase.from("campaigns").select("id, status");
      let leadsQuery = supabase.from("leads").select("id, is_opted_out");
      let outboundQuery = supabase
        .from("messages_outbound")
        .select("id, status");
      let inboundQuery = supabase.from("messages_inbound").select("id");

      if (selectedClientId) {
        campaignsQuery = campaignsQuery.eq("client_id", selectedClientId);
        leadsQuery = leadsQuery.eq("client_id", selectedClientId);
        outboundQuery = outboundQuery.eq("client_id", selectedClientId);
        inboundQuery = inboundQuery.eq("client_id", selectedClientId);
      }

      const [campaigns, leads, outbound, inbound] = await Promise.all([
        campaignsQuery,
        leadsQuery,
        outboundQuery,
        inboundQuery,
      ]);

      return {
        totalCampaigns: campaigns.data?.length ?? 0,
        activeCampaigns:
          campaigns.data?.filter((c) => c.status === "active").length ?? 0,
        totalLeads: leads.data?.length ?? 0,
        activeLeads: leads.data?.filter((l) => !l.is_opted_out).length ?? 0,
        messagesSent:
          outbound.data?.filter((m) => m.status === "sent").length ?? 0,
        messagesFailed:
          outbound.data?.filter((m) => m.status === "failed").length ?? 0,
        messagesReceived: inbound.data?.length ?? 0,
      };
    },
  });

  // Dados para gráfico de linha (mensagens por dia)
  const { data: dailyMessages } = useQuery({
    queryKey: ["dashboard-daily-messages", selectedClientId, dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = endOfDay(new Date());

      let query = supabase
        .from("messages_outbound")
        .select("created_at, status")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;

      // Agrupar por dia
      const groupedData: Record<string, { sent: number; failed: number }> = {};

      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), "dd/MM");

        groupedData[date] = { sent: 0, failed: 0 };
      }

      data?.forEach((msg) => {
        const date = format(new Date(msg.created_at), "dd/MM");

        if (groupedData[date]) {
          if (msg.status === "sent") {
            groupedData[date].sent++;
          } else if (msg.status === "failed") {
            groupedData[date].failed++;
          }
        }
      });

      return Object.entries(groupedData).map(([date, counts]) => ({
        date,
        enviadas: counts.sent,
        falhadas: counts.failed,
      }));
    },
  });

  // Dados para gráfico de pizza (tipos de resposta)
  const { data: responseTypes } = useQuery({
    queryKey: ["dashboard-response-types", selectedClientId],
    queryFn: async () => {
      let query = supabase.from("responses").select("type");

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;

      const counts = {
        positive: 0,
        unsubscribe: 0,
        other: 0,
      };

      data?.forEach((response) => {
        counts[response.type]++;
      });

      return [
        { name: "Interessados", value: counts.positive, color: "#00C49F" },
        { name: "Descadastros", value: counts.unsubscribe, color: "#FF8042" },
        { name: "Outros", value: counts.other, color: "#8884D8" },
      ].filter((item) => item.value > 0);
    },
  });

  // Métricas por campanha
  const { data: campaignMetrics } = useQuery({
    queryKey: ["dashboard-campaign-metrics", selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from("v_campaign_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data } = await query;

      return (
        data?.map((c) => ({
          name: c.campaign_name,
          enviadas: c.sent_count || 0,
          respostas: (c.positive_responses || 0) + (c.unsubscribe_count || 0),
          taxa:
            c.sent_count > 0
              ? (((c.positive_responses || 0) + (c.unsubscribe_count || 0)) /
                  c.sent_count) *
                100
              : 0,
        })) ?? []
      );
    },
  });

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-4">
          <Select
            className="w-32"
            label="Período"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <SelectItem key="7" value="7">
              7 dias
            </SelectItem>
            <SelectItem key="15" value="15">
              15 dias
            </SelectItem>
            <SelectItem key="30" value="30">
              30 dias
            </SelectItem>
          </Select>
          <Select
            className="w-48"
            label="Cliente"
            placeholder="Todos"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <SelectItem key="" value="">
              Todos os clientes
            </SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
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
              {generalMetrics?.messagesReceived ?? 0}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de linha - Mensagens por dia */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Mensagens por Dia</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <LineChart data={dailyMessages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  dataKey="enviadas"
                  stroke="#00C49F"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="falhadas"
                  stroke="#FF8042"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Gráfico de pizza - Tipos de resposta */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tipos de Resposta</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={responseTypes}
                  dataKey="value"
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  outerRadius={80}
                >
                  {responseTypes?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Gráfico de barras - Performance por campanha */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold">Performance por Campanha</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={campaignMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="enviadas" fill="#0088FE" />
                <Bar dataKey="respostas" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
