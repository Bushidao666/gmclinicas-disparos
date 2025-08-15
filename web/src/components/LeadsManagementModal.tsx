"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/modal";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Input } from "@heroui/input";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Pagination } from "@heroui/pagination";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Users,
  Upload,
  Download,
  Search,
  X,
  UserX,
  TrendingUp,
  BarChart3,
  Phone,
} from "lucide-react";

import { LeadsUploadTab } from "./LeadsUploadTab";
import { LeadsStatsTab } from "./LeadsStatsTab";

import { useClientDetails } from "@/hooks/useClientDetails";
import { useLeadsByClient } from "@/hooks/useLeadsByClient";
import { useLeadsStats } from "@/hooks/useLeadsStats";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface LeadsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
}

export function LeadsManagementModal({
  isOpen,
  onClose,
  clientId,
}: LeadsManagementModalProps) {
  const { data: client, isLoading: clientLoading } = useClientDetails(clientId);
  const { data: stats } = useLeadsStats(clientId);
  
  // Estados para filtros e busca
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [includeOptedOut, setIncludeOptedOut] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const debouncedSearch = useDebouncedValue(search, 300);
  
  // Buscar leads
  const { data: leadsData, isLoading: leadsLoading } = useLeadsByClient({
    clientId,
    page,
    pageSize,
    search: debouncedSearch,
    includeOptedOut,
    tags: selectedTags,
  });

  const totalPages = Math.ceil((leadsData?.total ?? 0) / pageSize);

  // Função para exportar leads
  const handleExportLeads = useCallback(async () => {
    if (!clientId || !client) return;
    
    try {
      // Por enquanto, vamos exportar apenas a página atual
      const csvContent = [
        ["Nome", "WhatsApp", "Tags", "Opt-out", "Data de Cadastro"],
        ...(leadsData?.items ?? []).map(lead => [
          lead.full_name || "",
          lead.whatsapp_e164,
          (lead.tags || []).join("; "),
          lead.is_opted_out ? "Sim" : "Não",
          format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `leads_${client.name}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
      link.click();
      
      toast.success("Leads exportados com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar leads");
      console.error("Erro ao exportar:", error);
    }
  }, [clientId, client, leadsData]);

  // Função para remover opt-out
  const handleToggleOptOut = useCallback(async (leadId: string, currentStatus: boolean) => {
    // Implementar toggle de opt-out
    toast.info("Função em desenvolvimento");
  }, []);

  if (!clientId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {clientLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : client ? (
          <>
            <ModalHeader className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <Avatar
                  src={client.photo_url || undefined}
                  name={client.name}
                  size="lg"
                />
                <div>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stats?.totalLeads ?? 0} leads
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {stats?.activeLeads ?? 0} ativos
                    </span>
                    <span className="flex items-center gap-1">
                      <UserX className="w-4 h-4" />
                      {stats?.optedOutLeads ?? 0} opt-outs
                    </span>
                  </div>
                </div>
              </div>
              <Button
                isIconOnly
                variant="light"
                onPress={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </ModalHeader>
            <ModalBody className="pb-6">
              <Tabs aria-label="Gerenciamento de leads">
                <Tab 
                  key="leads" 
                  title={
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Leads
                    </div>
                  }
                >
                  <div className="space-y-4 mt-4">
                    {/* Barra de ferramentas */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                          placeholder="Buscar por nome ou telefone..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          startContent={<Search className="w-4 h-4 text-gray-400" />}
                          className="w-full sm:w-64"
                        />
                        <Button
                          variant="flat"
                          onPress={() => setIncludeOptedOut(!includeOptedOut)}
                          color={includeOptedOut ? "warning" : "default"}
                        >
                          {includeOptedOut ? "Mostrando Opt-outs" : "Ocultar Opt-outs"}
                        </Button>
                      </div>
                      <Button
                        color="primary"
                        variant="flat"
                        startContent={<Download className="w-4 h-4" />}
                        onPress={handleExportLeads}
                      >
                        Exportar
                      </Button>
                    </div>

                    {/* Estatísticas rápidas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="bg-primary-50 dark:bg-primary-900/20">
                        <CardBody className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-primary-600 dark:text-primary-400">Total</p>
                              <p className="text-2xl font-semibold">{leadsData?.total ?? 0}</p>
                            </div>
                            <Users className="w-8 h-8 text-primary-500 opacity-50" />
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="bg-success-50 dark:bg-success-900/20">
                        <CardBody className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-success-600 dark:text-success-400">Ativos</p>
                              <p className="text-2xl font-semibold">{leadsData?.totalActive ?? 0}</p>
                            </div>
                            <Phone className="w-8 h-8 text-success-500 opacity-50" />
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="bg-danger-50 dark:bg-danger-900/20">
                        <CardBody className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-danger-600 dark:text-danger-400">Opt-outs</p>
                              <p className="text-2xl font-semibold">{leadsData?.totalOptedOut ?? 0}</p>
                            </div>
                            <UserX className="w-8 h-8 text-danger-500 opacity-50" />
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Tabela de leads */}
                    <div className="bg-content1 rounded-large p-2">
                      <Table 
                        aria-label="Lista de leads"
                        bottomContent={
                          totalPages > 1 && (
                            <div className="flex w-full justify-center">
                              <Pagination
                                isCompact
                                showControls
                                showShadow
                                color="primary"
                                page={page}
                                total={totalPages}
                                onChange={setPage}
                              />
                            </div>
                          )
                        }
                      >
                        <TableHeader>
                          <TableColumn>NOME</TableColumn>
                          <TableColumn>WHATSAPP</TableColumn>
                          <TableColumn>TAGS</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                          <TableColumn>CADASTRO</TableColumn>
                          <TableColumn>AÇÕES</TableColumn>
                        </TableHeader>
                        <TableBody
                          emptyContent={leadsLoading ? "Carregando..." : "Nenhum lead encontrado"}
                          isLoading={leadsLoading}
                          items={leadsData?.items ?? []}
                        >
                          {(lead) => (
                            <TableRow key={lead.id}>
                              <TableCell>
                                {lead.full_name || <span className="text-gray-400">Sem nome</span>}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {lead.whatsapp_e164}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {lead.tags && lead.tags.length > 0 ? (
                                    lead.tags.slice(0, 3).map((tag, idx) => (
                                      <Chip key={idx} size="sm" variant="flat">
                                        {tag}
                                      </Chip>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-sm">Sem tags</span>
                                  )}
                                  {lead.tags && lead.tags.length > 3 && (
                                    <Chip size="sm" variant="flat">
                                      +{lead.tags.length - 3}
                                    </Chip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {lead.is_opted_out ? (
                                  <Chip color="danger" size="sm" variant="flat">
                                    Opt-out
                                  </Chip>
                                ) : (
                                  <Chip color="success" size="sm" variant="flat">
                                    Ativo
                                  </Chip>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color={lead.is_opted_out ? "success" : "danger"}
                                  onPress={() => handleToggleOptOut(lead.id, lead.is_opted_out)}
                                >
                                  {lead.is_opted_out ? "Reativar" : "Opt-out"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Tab>

                <Tab 
                  key="upload" 
                  title={
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </div>
                  }
                >
                  <LeadsUploadTab clientId={clientId} clientName={client.name} />
                </Tab>

                <Tab 
                  key="stats" 
                  title={
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Estatísticas
                    </div>
                  }
                >
                  <LeadsStatsTab clientId={clientId} />
                </Tab>
              </Tabs>
            </ModalBody>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-600">Cliente não encontrado</p>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}