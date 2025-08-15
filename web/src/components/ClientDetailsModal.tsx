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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Users,
  Send,
  Phone,
  MessageSquare,
  X,
  Plus,
  Lock,
  Mail,
  Key,
  Clock,
  RefreshCw,
} from "lucide-react";

import { useClientDetails } from "@/hooks/useClientDetails";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "danger";
}

function MetricCard({ title, value, subtitle, icon, color = "default" }: MetricCardProps) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function ClientDetailsModal({
  isOpen,
  onClose,
  clientId,
}: ClientDetailsModalProps) {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();
  const { data: client, isLoading } = useClientDetails(clientId);
  
  // Estados para gerenciar acesso
  const [email, setEmail] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [lastInviteSent, setLastInviteSent] = useState<Date | null>(null);
  const [canResend, setCanResend] = useState(true);

  // Buscar campanhas do cliente
  const { data: campaigns } = useQuery({
    queryKey: ["client-campaigns", clientId],
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
          created_at,
          instance:evoapi_instances!campaigns_evoapi_instance_id_fkey(name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Buscar instâncias do cliente
  const { data: instances } = useQuery({
    queryKey: ["client-instances", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("evoapi_instances")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Atualizar email quando cliente carregar
  useEffect(() => {
    if (client?.email) {
      setEmail(client.email);
    }
  }, [client]);

  // Função para enviar convite
  const handleSendInvite = async () => {
    if (!email) {
      toast.error("Por favor, informe um email");
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, informe um email válido");
      return;
    }

    setAccessLoading(true);
    try {
      // Primeiro, preparar o cliente para receber o convite
      const { data: prepareData, error: prepareError } = await supabase.rpc("invite_client_by_email", {
        p_client_id: clientId,
        p_email: email
      });

      if (prepareError) {
        console.error("Erro ao preparar convite:", prepareError);
        
        // Tratamento específico de erros
        if (prepareError.message?.includes("já possui acesso")) {
          toast.error("Este cliente já possui acesso ao sistema");
        } else if (prepareError.message?.includes("já está cadastrado")) {
          toast.error("Este email já está sendo usado no sistema");
        } else if (prepareError.message?.includes("administradores")) {
          toast.error("Você não tem permissão para enviar convites");
        } else {
          toast.error(prepareError.message || "Erro ao preparar convite");
        }
        return;
      }

      // Enviar magic link para o email do cliente
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          data: {
            client_id: clientId,
            client_name: client.name,
            role: 'client',
            full_name: client.name
          },
          emailRedirectTo: `${window.location.origin}/auth/setup-password?client_id=${clientId}`
        }
      });

      if (inviteError) {
        console.error("Erro ao enviar convite:", inviteError);
        
        // Reverter a preparação do cliente
        await supabase
          .from("clients")
          .update({ email: null })
          .eq("id", clientId);
        
        if (inviteError.message?.includes("rate limit")) {
          toast.error("Muitos convites enviados. Aguarde alguns minutos e tente novamente.");
        } else {
          toast.error("Erro ao enviar convite por email. Verifique as configurações.");
        }
        return;
      }

      toast.success("Convite enviado com sucesso!", {
        description: `Um email foi enviado para ${email} com instruções para acessar o sistema.`,
        duration: 5000
      });
      
      // Registrar quando o convite foi enviado
      setLastInviteSent(new Date());
      setCanResend(false);
      
      // Habilitar reenvio após 60 segundos
      setTimeout(() => {
        setCanResend(true);
      }, 60000);
      
      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ["client-details", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      toast.error("Erro inesperado ao enviar convite");
    } finally {
      setAccessLoading(false);
    }
  };

  // Função para remover acesso
  const handleRemoveAccess = async () => {
    if (!client.user_id) {
      toast.error("Este cliente não possui acesso para remover");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja remover o acesso deste cliente?\n\n" +
      "⚠️ O cliente não poderá mais fazer login no sistema."
    );

    if (!confirmed) {
      return;
    }

    setAccessLoading(true);
    try {
      // Atualizar cliente removendo user_id (mantém o email para referência)
      const { error } = await supabase
        .from("clients")
        .update({ user_id: null })
        .eq("id", clientId);

      if (error) {
        console.error("Erro ao remover acesso:", error);
        
        if (error.code === "23503") {
          toast.error("Não é possível remover o acesso devido a dados relacionados");
        } else {
          toast.error(error.message || "Erro ao remover acesso");
        }
        return;
      }

      toast.success("Acesso removido com sucesso", {
        description: "O cliente não pode mais fazer login no sistema"
      });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ["client-details", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
      // Não limpar o email, pois pode ser útil manter para referência
    } catch (error: any) {
      console.error("Erro ao remover acesso:", error);
      toast.error("Erro inesperado ao remover acesso");
    } finally {
      setAccessLoading(false);
    }
  };

  if (!clientId) return null;

  const statusColorMap = {
    draft: "default",
    active: "success",
    paused: "warning",
    completed: "primary",
    canceled: "danger",
    connected: "success",
    disconnected: "danger",
    unknown: "default",
  } as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : client ? (
          <>
            <ModalHeader className="flex items-center gap-4 pb-2">
              <Avatar
                src={client.photo_url || undefined}
                name={client.name}
                size="lg"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{client.name}</h2>
                <p className="text-sm text-gray-600">
                  Cliente desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
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
              <Tabs aria-label="Detalhes do cliente">
                <Tab key="overview" title="Visão Geral">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <MetricCard
                      title="Total de Leads"
                      value={client.metrics.totalLeads}
                      icon={<Users className="w-5 h-5 text-primary" />}
                      color="primary"
                    />
                    <MetricCard
                      title="Campanhas Ativas"
                      value={`${client.metrics.activeCampaigns}/${client.metrics.totalCampaigns}`}
                      subtitle="Ativas / Total"
                      icon={<Send className="w-5 h-5 text-success" />}
                      color="success"
                    />
                    <MetricCard
                      title="Instâncias"
                      value={`${client.metrics.connectedInstances}/${client.metrics.totalInstances}`}
                      subtitle="Conectadas / Total"
                      icon={<Phone className="w-5 h-5 text-warning" />}
                      color="warning"
                    />
                    <MetricCard
                      title="Taxa de Resposta"
                      value={
                        client.metrics.totalMessagesSent > 0
                          ? `${Math.round((client.metrics.totalResponses / client.metrics.totalMessagesSent) * 100)}%`
                          : "0%"
                      }
                      subtitle={`${client.metrics.totalResponses} respostas`}
                      icon={<MessageSquare className="w-5 h-5 text-danger" />}
                      color="danger"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardBody>
                        <p className="text-sm text-gray-600 mb-2">Mensagens</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Enviadas</span>
                            <span className="font-medium">{client.metrics.totalMessagesSent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Recebidas</span>
                            <span className="font-medium">{client.metrics.totalMessagesReceived}</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardBody>
                        <p className="text-sm text-gray-600 mb-2">Respostas</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Positivas</span>
                            <span className="font-medium text-success">{client.metrics.positiveResponses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Opt-outs</span>
                            <span className="font-medium text-danger">{client.metrics.unsubscribes}</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardBody>
                        <p className="text-sm text-gray-600 mb-2">Performance</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Taxa de Entrega</span>
                            <span className="font-medium">
                              {client.metrics.totalMessagesSent > 0 ? "98%" : "0%"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Engajamento</span>
                            <span className="font-medium">
                              {client.metrics.totalMessagesSent > 0
                                ? `${Math.round((client.metrics.totalMessagesReceived / client.metrics.totalMessagesSent) * 100)}%`
                                : "0%"}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </Tab>

                <Tab key="campaigns" title="Campanhas">
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-600">
                        Total de {campaigns?.length || 0} campanhas
                      </p>
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<Plus className="w-4 h-4" />}
                      >
                        Nova Campanha
                      </Button>
                    </div>

                    {campaigns && campaigns.length > 0 ? (
                      <Table aria-label="Campanhas do cliente">
                        <TableHeader>
                          <TableColumn>NOME</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                          <TableColumn>INÍCIO</TableColumn>
                          <TableColumn>VOLUME</TableColumn>
                          <TableColumn>INSTÂNCIA</TableColumn>
                        </TableHeader>
                        <TableBody items={campaigns}>
                          {(campaign) => (
                            <TableRow key={campaign.id}>
                              <TableCell>{campaign.name}</TableCell>
                              <TableCell>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={statusColorMap[campaign.status as keyof typeof statusColorMap]}
                                >
                                  {campaign.status}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                {format(new Date(campaign.start_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>{campaign.daily_volume} msgs/dia</TableCell>
                              <TableCell>{campaign.instance?.name || "-"}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600">Nenhuma campanha encontrada</p>
                      </div>
                    )}
                  </div>
                </Tab>

                <Tab key="instances" title="Instâncias">
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-600">
                        Total de {instances?.length || 0} instâncias
                      </p>
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<Plus className="w-4 h-4" />}
                      >
                        Vincular Instância
                      </Button>
                    </div>

                    {instances && instances.length > 0 ? (
                      <Table aria-label="Instâncias do cliente">
                        <TableHeader>
                          <TableColumn>NOME</TableColumn>
                          <TableColumn>ID DA INSTÂNCIA</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                          <TableColumn>LIMITE</TableColumn>
                          <TableColumn>ÚLTIMA CONEXÃO</TableColumn>
                        </TableHeader>
                        <TableBody items={instances}>
                          {(instance) => (
                            <TableRow key={instance.id}>
                              <TableCell>{instance.name || instance.instance_id}</TableCell>
                              <TableCell className="font-mono text-xs">{instance.instance_id}</TableCell>
                              <TableCell>
                                <Chip
                                  size="sm"
                                  variant="dot"
                                  color={statusColorMap[instance.status as keyof typeof statusColorMap]}
                                >
                                  {instance.status}
                                </Chip>
                              </TableCell>
                              <TableCell>{instance.max_msgs_per_minute} msgs/min</TableCell>
                              <TableCell>
                                {instance.last_connected_at
                                  ? format(new Date(instance.last_connected_at), "dd/MM HH:mm", { locale: ptBR })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600">Nenhuma instância encontrada</p>
                      </div>
                    )}
                  </div>
                </Tab>

                <Tab key="metrics" title="Métricas">
                  <div className="mt-4 space-y-6">
                    <Card>
                      <CardBody>
                        <h3 className="font-semibold mb-4">Resumo de Mensagens</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Total Enviadas</p>
                            <p className="text-2xl font-semibold">{client.metrics.totalMessagesSent}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Recebidas</p>
                            <p className="text-2xl font-semibold">{client.metrics.totalMessagesReceived}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Respostas Positivas</p>
                            <p className="text-2xl font-semibold text-success">{client.metrics.positiveResponses}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Descadastros</p>
                            <p className="text-2xl font-semibold text-danger">{client.metrics.unsubscribes}</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardBody>
                        <h3 className="font-semibold mb-4">Análise de Performance</h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Taxa de Resposta</span>
                              <span className="text-sm font-medium">
                                {client.metrics.totalMessagesSent > 0
                                  ? `${Math.round((client.metrics.totalResponses / client.metrics.totalMessagesSent) * 100)}%`
                                  : "0%"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{
                                  width: client.metrics.totalMessagesSent > 0
                                    ? `${Math.round((client.metrics.totalResponses / client.metrics.totalMessagesSent) * 100)}%`
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Taxa de Engajamento</span>
                              <span className="text-sm font-medium">
                                {client.metrics.totalMessagesSent > 0
                                  ? `${Math.round((client.metrics.totalMessagesReceived / client.metrics.totalMessagesSent) * 100)}%`
                                  : "0%"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-success rounded-full h-2"
                                style={{
                                  width: client.metrics.totalMessagesSent > 0
                                    ? `${Math.round((client.metrics.totalMessagesReceived / client.metrics.totalMessagesSent) * 100)}%`
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Taxa de Opt-out</span>
                              <span className="text-sm font-medium">
                                {client.metrics.totalMessagesSent > 0
                                  ? `${Math.round((client.metrics.unsubscribes / client.metrics.totalMessagesSent) * 100)}%`
                                  : "0%"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-danger rounded-full h-2"
                                style={{
                                  width: client.metrics.totalMessagesSent > 0
                                    ? `${Math.round((client.metrics.unsubscribes / client.metrics.totalMessagesSent) * 100)}%`
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </Tab>

                <Tab key="access" title="Acesso">
                  <div className="mt-4 space-y-6">
                    <Card>
                      <CardBody>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 rounded-lg bg-primary-100">
                            <Lock className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Gerenciar Acesso</h3>
                            <p className="text-sm text-gray-600">
                              Controle o acesso do cliente à plataforma
                            </p>
                          </div>
                        </div>

                        {client.user_id ? (
                          // Cliente COM acesso
                          <div className="space-y-4">
                            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Chip color="success" size="sm" variant="flat">
                                  Acesso Ativo
                                </Chip>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium">Email:</span>
                                  <span className="text-sm">{client.email}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                  O cliente pode acessar o sistema com este email
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                color="danger"
                                variant="flat"
                                isLoading={accessLoading}
                                onPress={handleRemoveAccess}
                                startContent={<X className="w-4 h-4" />}
                              >
                                Remover Acesso
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Cliente SEM acesso
                          <div className="space-y-4">
                            <div className="p-4 bg-default-100 rounded-lg border border-default-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Chip color="default" size="sm" variant="flat">
                                  Sem Acesso
                                </Chip>
                              </div>
                              <p className="text-sm text-gray-600">
                                Este cliente ainda não possui acesso ao sistema
                              </p>
                            </div>

                            <div className="space-y-4">
                              <Input
                                label="Email do Cliente"
                                placeholder="cliente@empresa.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                startContent={<Mail className="w-4 h-4 text-gray-400" />}
                                description="O cliente receberá um convite para criar sua senha neste email"
                              />

                              <div className="space-y-3">
                                <Button
                                  color="primary"
                                  isLoading={accessLoading}
                                  onPress={handleSendInvite}
                                  startContent={<Mail className="w-4 h-4" />}
                                  className="w-full"
                                  isDisabled={!email || !canResend}
                                >
                                  Enviar Convite
                                </Button>

                                {lastInviteSent && (
                                  <div className="p-3 bg-default-100 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-default-600" />
                                        <span className="text-sm text-default-700">
                                          Convite enviado às {format(lastInviteSent, "HH:mm")}
                                        </span>
                                      </div>
                                      {!canResend && (
                                        <span className="text-xs text-default-500">
                                          Aguarde 60s para reenviar
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>

                    {client.user_id && (
                      <Card>
                        <CardBody>
                          <h4 className="font-medium mb-3">Informações de Acesso</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Criado em:</span>
                              <span>
                                {format(new Date(client.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">ID do Usuário:</span>
                              <span className="font-mono text-xs">{client.user_id}</span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </div>
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