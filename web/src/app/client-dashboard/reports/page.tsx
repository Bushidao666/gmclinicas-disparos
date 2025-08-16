"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { useQuery } from "@tanstack/react-query";
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
  ResponsiveContainer 
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, TrendingUp, MessageSquare, Users, Target, Calendar } from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface DateRange {
  start: Date;
  end: Date;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function ClientReports() {
  const supabase = createSupabaseClient();
  const { profile } = useUserRole();
  const clientId = profile?.client?.id;
  
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 7),
    end: new Date()
  });
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  // Buscar campanhas para o filtro
  const { data: campaigns } = useQuery({
    queryKey: ["client-campaigns-for-filter", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Buscar dados de mensagens por dia
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["client-messages-report", clientId, dateRange, selectedCampaign],
    queryFn: async () => {
      if (!clientId) return [];

      let query = supabase
        .from("messages_outbound")
        .select("id, status, sent_at, created_at, campaign_id")
        .eq("client_id", clientId)
        .gte("sent_at", dateRange.start.toISOString())
        .lte("sent_at", dateRange.end.toISOString());

      if (selectedCampaign !== "all") {
        query = query.eq("campaign_id", selectedCampaign);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por dia
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const dailyData = days.map(day => {
        const dayMessages = data?.filter(msg => {
          const msgDate = new Date(msg.sent_at || msg.created_at);
          return format(msgDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
        }) || [];

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          total: dayMessages.length,
          sent: dayMessages.filter(m => m.status === "sent").length,
          failed: dayMessages.filter(m => m.status === "failed").length,
        };
      });

      return dailyData;
    },
    enabled: !!clientId,
  });

  // Buscar dados de respostas
  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ["client-responses-report", clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("responses")
        .select("id, type, created_at")
        .eq("client_id", clientId)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (error) throw error;

      // Agrupar por tipo
      const grouped = data?.reduce((acc, response) => {
        const type = response.type;
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      }, {} as Record<string, number>) || {};

      return [
        { name: "Positivas", value: grouped.positive || 0, color: "#00C49F" },
        { name: "Descadastros", value: grouped.unsubscribe || 0, color: "#FF8042" },
        { name: "Outras", value: grouped.other || 0, color: "#8884D8" },
      ];
    },
    enabled: !!clientId,
  });

  // Buscar métricas de campanhas
  const { data: campaignMetrics, isLoading: campaignMetricsLoading } = useQuery({
    queryKey: ["client-campaign-metrics", clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return [];

      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          campaign_targets(status),
          messages_outbound(status)
        `)
        .eq("client_id", clientId);

      if (error) throw error;

      return campaigns?.map(campaign => {
        const targets = campaign.campaign_targets || [];
        const messages = campaign.messages_outbound || [];
        
        return {
          name: campaign.name,
          enviadas: messages.filter(m => m.status === "sent").length,
          falhas: messages.filter(m => m.status === "failed").length,
          pendentes: targets.filter(t => t.status === "queued").length,
          taxaSucesso: messages.length > 0 
            ? Math.round((messages.filter(m => m.status === "sent").length / messages.length) * 100)
            : 0
        };
      }).filter(c => c.enviadas > 0 || c.falhas > 0 || c.pendentes > 0) || [];
    },
    enabled: !!clientId,
  });

  // Calcular totais
  const totals = useMemo(() => {
    if (!messagesData) return { sent: 0, failed: 0, total: 0, successRate: 0 };
    
    const sent = messagesData.reduce((acc, day) => acc + day.sent, 0);
    const failed = messagesData.reduce((acc, day) => acc + day.failed, 0);
    const total = sent + failed;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    
    return { sent, failed, total, successRate };
  }, [messagesData]);

  const handleExportCSV = () => {
    if (!messagesData) return;

    const csvContent = [
      ["Data", "Total", "Enviadas", "Falhas"],
      ...messagesData.map(day => [day.date, day.total, day.sent, day.failed])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-mensagens-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = messagesLoading || responsesLoading || campaignMetricsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada das suas campanhas e métricas
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Download className="w-4 h-4" />}
          onPress={handleExportCSV}
          isDisabled={!messagesData || messagesData.length === 0}
        >
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Input
                type="date"
                label="Data Inicial"
                value={format(dateRange.start, "yyyy-MM-dd")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setDateRange(prev => ({ ...prev, start: newDate }));
                  }
                }}
                startContent={<Calendar className="w-4 h-4 text-muted-foreground" />}
              />
              <Input
                type="date"
                label="Data Final"
                value={format(dateRange.end, "yyyy-MM-dd")}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setDateRange(prev => ({ ...prev, end: newDate }));
                  }
                }}
                startContent={<Calendar className="w-4 h-4 text-muted-foreground" />}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                label="Campanha"
                placeholder="Todas as campanhas"
                selectedKeys={[selectedCampaign]}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                items={[{ id: "all", name: "Todas as campanhas" }, ...((campaigns as any) || [])]}
              >
                {(item: any) => (
                  <SelectItem key={item.id}>
                    {item.name}
                  </SelectItem>
                )}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Enviadas</p>
                <p className="text-2xl font-bold">{totals.total.toLocaleString("pt-BR")}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{totals.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviadas com Sucesso</p>
                <p className="text-2xl font-bold text-success">{totals.sent.toLocaleString("pt-BR")}</p>
              </div>
              <Target className="w-8 h-8 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas</p>
                <p className="text-2xl font-bold text-danger">{totals.failed.toLocaleString("pt-BR")}</p>
              </div>
              <Users className="w-8 h-8 text-danger opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Gráfico de Mensagens por Dia */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Mensagens por Dia</h2>
            </CardHeader>
            <CardBody>
              {messagesData && messagesData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={messagesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="#00C49F" 
                        name="Enviadas"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="failed" 
                        stroke="#FF8042" 
                        name="Falhas"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardBody>
          </Card>

          {/* Gráficos lado a lado */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de Respostas */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Tipos de Resposta</h2>
              </CardHeader>
              <CardBody>
                {responsesData && responsesData.some(r => r.value > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={responsesData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: { name?: string; percent?: number }) => `${props.name ?? ""} ${(((props.percent ?? 0) * 100).toFixed(0))}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {responsesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma resposta registrada no período
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Gráfico de Performance por Campanha */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Performance por Campanha</h2>
              </CardHeader>
              <CardBody>
                {campaignMetrics && campaignMetrics.length > 0 ? (
                  <div className="h-64 overflow-x-auto">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                      <BarChart data={campaignMetrics.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="enviadas" fill="#00C49F" name="Enviadas" />
                        <Bar dataKey="falhas" fill="#FF8042" name="Falhas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha com dados no período
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Tabela de Campanhas */}
          {campaignMetrics && campaignMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Detalhamento por Campanha</h2>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Campanha</th>
                        <th className="text-right py-2">Enviadas</th>
                        <th className="text-right py-2">Falhas</th>
                        <th className="text-right py-2">Pendentes</th>
                        <th className="text-right py-2">Taxa de Sucesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignMetrics.map((campaign, index) => (
                        <tr key={index} className="border-b hover:bg-accent/50">
                          <td className="py-2">{campaign.name}</td>
                          <td className="text-right py-2">{campaign.enviadas.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 text-danger">{campaign.falhas.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 text-warning">{campaign.pendentes.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2">
                            <span className={`font-medium ${
                              campaign.taxaSucesso >= 90 ? "text-success" : 
                              campaign.taxaSucesso >= 70 ? "text-warning" : 
                              "text-danger"
                            }`}>
                              {campaign.taxaSucesso}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}