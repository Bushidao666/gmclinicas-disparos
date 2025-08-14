"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Card } from "@heroui/card";

import { InstanceCard } from "@/components/InstanceCard";
import { useClients } from "@/hooks/useClients";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Instance {
  id: string;
  instance_id: string;
  name: string | null;
  base_url: string | null;
  client_id: string | null;
  status?: string;
  last_connected_at?: string | null;
}

export default function InstancesPage() {
  const supabase = createSupabaseClient();
  const { data: clients = [] } = useClients();

  // Estados locais
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "connected" | "disconnected"
  >("all");
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);

  // Buscar instâncias
  const {
    data: instances = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["evoapi_instances"],
    queryFn: async (): Promise<Instance[]> => {
      const { data, error } = await supabase
        .from("evoapi_instances")
        .select("*")
        .order("name", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return data || [];
    },
  });

  // 🔥 REALTIME: Escutar mudanças
  useRealtimeSubscription({
    channel: "instances-realtime",
    table: "evoapi_instances",
    onChange: () => {
      // Instâncias atualizadas via Realtime
      refetch();
    },
  });

  // Sincronizar com Evolution API
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pull-evo-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();

        throw new Error(error.error || `Erro HTTP: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Sincronização concluída
      refetch();
    },
    onError: (error: any) => {
      // Erro na sincronização: error
      alert(`Erro ao sincronizar: ${error.message}`);
    },
  });

  // Filtrar instâncias
  const filteredInstances = useMemo(() => {
    let filtered = [...instances];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (inst) =>
          inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inst.instance_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clients
            .find((c) => c.id === inst.client_id)
            ?.name.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Filtro por status
    if (filterStatus !== "all") {
      filtered = filtered.filter((inst) => {
        const isConnected = inst.status === "connected";

        return filterStatus === "connected" ? isConnected : !isConnected;
      });
    }

    // Filtro por vínculo
    if (showOnlyUnlinked) {
      filtered = filtered.filter((inst) => !inst.client_id);
    }

    return filtered;
  }, [instances, searchTerm, filterStatus, showOnlyUnlinked, clients]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = instances.length;
    const connected = instances.filter((i) => i.status === "connected").length;
    const linked = instances.filter((i) => i.client_id).length;

    return { total, connected, linked };
  }, [instances]);

  return (
    <main className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Instâncias Evolution
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas instâncias WhatsApp e vincule aos clientes
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Chip color="success" size="sm" variant="dot">
                Realtime Ativo
              </Chip>
              <span className="text-xs text-gray-500">
                Atualizações automáticas em tempo real
              </span>
            </div>
          </div>

          <Button
            className="font-semibold"
            color="primary"
            isLoading={syncMutation.isPending}
            size="lg"
            onPress={() => syncMutation.mutate()}
          >
            {syncMutation.isPending
              ? "Sincronizando..."
              : "🔄 Sincronizar Instâncias"}
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {stats.total}
            </div>
            <div className="text-sm text-blue-600">Total de Instâncias</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {stats.connected}
            </div>
            <div className="text-sm text-green-600">Conectadas</div>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="text-2xl font-bold text-purple-700">
              {stats.linked}
            </div>
            <div className="text-sm text-purple-600">Vinculadas</div>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            className="flex-1"
            placeholder="🔍 Buscar por nome, ID ou cliente..."
            size="lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2">
            <Button
              color={filterStatus === "all" ? "primary" : "default"}
              variant={filterStatus === "all" ? "solid" : "flat"}
              onPress={() => setFilterStatus("all")}
            >
              Todas
            </Button>
            <Button
              color={filterStatus === "connected" ? "success" : "default"}
              variant={filterStatus === "connected" ? "solid" : "flat"}
              onPress={() => setFilterStatus("connected")}
            >
              Conectadas
            </Button>
            <Button
              color={filterStatus === "disconnected" ? "warning" : "default"}
              variant={filterStatus === "disconnected" ? "solid" : "flat"}
              onPress={() => setFilterStatus("disconnected")}
            >
              Desconectadas
            </Button>
            <Button
              color={showOnlyUnlinked ? "danger" : "default"}
              variant={showOnlyUnlinked ? "solid" : "flat"}
              onPress={() => setShowOnlyUnlinked(!showOnlyUnlinked)}
            >
              Sem Vínculo
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Instâncias */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            Carregando instâncias...
          </div>
        </div>
      ) : filteredInstances.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            {searchTerm || filterStatus !== "all" || showOnlyUnlinked ? (
              <>
                <p className="text-lg font-semibold mb-2">
                  Nenhuma instância encontrada
                </p>
                <p className="text-sm">Tente ajustar os filtros de busca</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold mb-2">
                  Sem instâncias cadastradas
                </p>
                <p className="text-sm">
                  Clique em &quot;Sincronizar Instâncias&quot; para buscar
                </p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              clients={clients}
              instance={instance}
              onUpdate={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Rodapé com informações */}
      {filteredInstances.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {filteredInstances.length} de {instances.length} instâncias
        </div>
      )}
    </main>
  );
}
