"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Pagination } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter } from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function ClientCampaigns() {
  const supabase = createSupabaseClient();
  const { profile } = useUserRole();
  const clientId = profile?.client?.id;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Buscar campanhas
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["client-campaigns-list", clientId, statusFilter],
    queryFn: async () => {
      if (!clientId) return { data: [], count: 0 };

      let query = supabase
        .from("campaigns")
        .select(`
          *,
          evoapi_instances!campaigns_evoapi_instance_id_fkey(
            name,
            status
          ),
          campaign_targets(
            status
          )
        `, { count: "exact" })
        .eq("client_id", clientId);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Processar dados para incluir estatísticas
      const processedData = data?.map((campaign: any) => {
        const targets = (campaign.campaign_targets || []) as Array<{ status: string }>; 
        const sent = targets.filter((t: { status: string }) => t.status === "sent").length;
        const failed = targets.filter((t: { status: string }) => t.status === "failed").length;
        const total = targets.length;

        return {
          ...campaign,
          stats: {
            total,
            sent,
            failed,
            pending: total - sent - failed,
            successRate: total > 0 ? Math.round((sent / total) * 100) : 0
          }
        };
      });

      return { data: processedData || [], count: count || 0 };
    },
    enabled: !!clientId,
  });

  // Filtrar campanhas pelo termo de busca
  const filteredCampaigns = campaigns?.data.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginação
  const totalPages = Math.ceil((campaigns?.count || 0) / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  const statusColors = {
    draft: "default",
    active: "success",
    paused: "warning",
    completed: "primary",
    canceled: "danger",
  } as const;

  const statusLabels = {
    draft: "Rascunho",
    active: "Ativa",
    paused: "Pausada",
    completed: "Concluída",
    canceled: "Cancelada",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <p className="text-muted-foreground">
          Visualize todas as suas campanhas de disparo
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome..."
                startContent={<Search className="w-4 h-4 text-muted-foreground" />}
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                placeholder="Status"
                selectedKeys={[statusFilter]}
                onChange={(e) => setStatusFilter(e.target.value)}
                startContent={<Filter className="w-4 h-4 text-muted-foreground" />}
              >
                <SelectItem key="all">
                  Todos os status
                </SelectItem>
                <SelectItem key="active">
                  Ativas
                </SelectItem>
                <SelectItem key="paused">
                  Pausadas
                </SelectItem>
                <SelectItem key="completed">
                  Concluídas
                </SelectItem>
                <SelectItem key="draft">
                  Rascunho
                </SelectItem>
                <SelectItem key="canceled">
                  Canceladas
                </SelectItem>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabela de Campanhas */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campanha' : 'campanhas'}
          </h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <>
              <Table aria-label="Tabela de campanhas">
                <TableHeader>
                  <TableColumn>NOME</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>INÍCIO</TableColumn>
                  <TableColumn>VOLUME DIÁRIO</TableColumn>
                  <TableColumn>PROGRESSO</TableColumn>
                  <TableColumn>TAXA DE SUCESSO</TableColumn>
                </TableHeader>
                <TableBody>
                  {paginatedCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          {campaign.evoapi_instances && (
                            <p className="text-xs text-muted-foreground">
                              {campaign.evoapi_instances.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={statusColors[campaign.status as keyof typeof statusColors]}
                          size="sm"
                          variant="flat"
                        >
                          {statusLabels[campaign.status as keyof typeof statusLabels]}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {format(new Date(campaign.start_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {campaign.daily_volume} msgs/dia
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Enviadas: {campaign.stats.sent}</span>
                            <span>Total: {campaign.stats.total}</span>
                          </div>
                          <div className="w-full bg-default-200 rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{
                                width: campaign.stats.total > 0 
                                  ? `${(campaign.stats.sent / campaign.stats.total) * 100}%`
                                  : "0%"
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            campaign.stats.successRate >= 90 ? 'text-success' :
                            campaign.stats.successRate >= 70 ? 'text-warning' :
                            'text-danger'
                          }`}>
                            {campaign.stats.successRate}%
                          </span>
                          {campaign.stats.failed > 0 && (
                            <span className="text-xs text-danger">
                              ({campaign.stats.failed} falhas)
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={totalPages}
                    page={page}
                    onChange={setPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha encontrada
            </div>
          )}
        </CardBody>
      </Card>

      {/* Resumo de Status */}
      {campaigns && campaigns.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = campaigns.data.filter(c => c.status === key).length;
            return (
              <Card key={key}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Chip
                      color={statusColors[key as keyof typeof statusColors]}
                      size="sm"
                      variant="flat"
                    >
                      {key}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}