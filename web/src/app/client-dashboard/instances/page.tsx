"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Input } from "@heroui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Phone, 
  Plus, 
  Wifi, 
  WifiOff, 
  MessageSquare,
  QrCode,
  Smartphone,
  RefreshCw
} from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Instance {
  id: string;
  name: string | null;
  instance_id: string;
  status: "connected" | "disconnected" | "unknown";
  max_msgs_per_minute: number;
  last_connected_at: string | null;
  created_at: string;
}

export default function ClientInstances() {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();
  const { profile } = useUserRole();
  const clientId = profile?.client?.id;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Buscar instâncias
  const { data: instances, isLoading, refetch } = useQuery({
    queryKey: ["client-instances-list", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("evoapi_instances")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Instance[];
    },
    enabled: !!clientId,
  });

  // Criar nova instância
  const createInstance = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Cliente não identificado");

      const instanceId = `client_${clientId.slice(0, 8)}_${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_EVOAPI_URL || "http://localhost:8080";
      const apiKey = `api_${Math.random().toString(36).substring(2, 15)}`;

      const { data, error } = await supabase
        .from("evoapi_instances")
        .insert({
          client_id: clientId,
          name: instanceName || `WhatsApp ${instances?.length ? instances.length + 1 : 1}`,
          instance_id: instanceId,
          base_url: baseUrl,
          api_key: apiKey,
          status: "disconnected",
          max_msgs_per_minute: 20
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Número criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-instances-list", clientId] });
      setIsModalOpen(false);
      setInstanceName("");
      setSelectedInstance(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar número");
    }
  });

  // Atualizar status da instância
  const updateInstanceStatus = async (instanceId: string) => {
    try {
      // Aqui você faria a chamada para a API do Evolution para verificar o status
      // Por enquanto, vamos simular
      toast.info("Verificando status...");
      
      // Simular atualização
      setTimeout(() => {
        refetch();
        toast.success("Status atualizado");
      }, 1000);
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const statusConfig = {
    connected: {
      color: "success" as const,
      icon: <Wifi className="w-4 h-4" />,
      label: "Conectado"
    },
    disconnected: {
      color: "danger" as const,
      icon: <WifiOff className="w-4 h-4" />,
      label: "Desconectado"
    },
    unknown: {
      color: "default" as const,
      icon: <Phone className="w-4 h-4" />,
      label: "Desconhecido"
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Números WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie seus números conectados para envio de mensagens
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => setIsModalOpen(true)}
        >
          Adicionar Número
        </Button>
      </div>

      {/* Lista de Instâncias */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : instances && instances.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => {
            const status = statusConfig[instance.status];
            return (
              <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {instance.name || instance.instance_id}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {instance.instance_id}
                      </p>
                    </div>
                  </div>
                  <Chip
                    color={status.color}
                    size="sm"
                    variant="flat"
                    startContent={status.icon}
                  >
                    {status.label}
                  </Chip>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limite:</span>
                      <span>{instance.max_msgs_per_minute} msgs/min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Última conexão:</span>
                      <span>
                        {instance.last_connected_at
                          ? format(new Date(instance.last_connected_at), "dd/MM HH:mm", { locale: ptBR })
                          : "Nunca conectado"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      {instance.status === "disconnected" && (
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          onPress={() => setSelectedInstance(instance)}
                          startContent={<QrCode className="w-4 h-4" />}
                        >
                          Conectar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => updateInstanceStatus(instance.id)}
                        startContent={<RefreshCw className="w-4 h-4" />}
                      >
                        Atualizar
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Nenhum número conectado
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione um número WhatsApp para começar a enviar mensagens
              </p>
              <Button
                color="primary"
                onPress={() => setIsModalOpen(true)}
                startContent={<Plus className="w-4 h-4" />}
              >
                Adicionar Primeiro Número
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Informações */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Limites de Envio</h3>
                <p className="text-sm text-muted-foreground">
                  Cada número possui um limite de mensagens por minuto para evitar bloqueios.
                  Respeite os limites para manter seus números ativos.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Wifi className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Conexão Estável</h3>
                <p className="text-sm text-muted-foreground">
                  Mantenha o WhatsApp Web aberto no dispositivo conectado para garantir
                  o funcionamento correto dos disparos.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal de Adicionar Número */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Adicionar Novo Número</ModalHeader>
              <ModalBody>
                <Input
                  label="Nome do Número (opcional)"
                  placeholder="Ex: Atendimento Principal"
                  value={instanceName}
                  onValueChange={setInstanceName}
                  description="Um nome para identificar este número"
                />
                <div className="mt-4 p-4 bg-warning/10 rounded-lg">
                  <p className="text-sm text-warning">
                    <strong>Importante:</strong> Após criar o número, você precisará
                    conectá-lo escaneando o QR Code com o WhatsApp.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => createInstance.mutate()}
                  isLoading={createInstance.isPending}
                >
                  Criar Número
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de QR Code (simplificado) */}
      {selectedInstance && (
        <Modal 
          isOpen={!!selectedInstance} 
          onClose={() => setSelectedInstance(null)}
          size="lg"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  Conectar {selectedInstance.name || selectedInstance.instance_id}
                </ModalHeader>
                <ModalBody>
                  <div className="text-center py-8">
                    <div className="w-64 h-64 bg-default-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-default-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Escaneie o QR Code com o WhatsApp para conectar
                    </p>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm">
                        <strong>Como conectar:</strong>
                      </p>
                      <ol className="text-sm text-left mt-2 space-y-1">
                        <li>1. Abra o WhatsApp no seu celular</li>
                        <li>2. Toque em Menu ou Configurações</li>
                        <li>3. Selecione &quot;Dispositivos conectados&quot;</li>
                        <li>4. Toque em &quot;Conectar dispositivo&quot;</li>
                        <li>5. Escaneie este QR Code</li>
                      </ol>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" onPress={onClose}>
                    Fechar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}