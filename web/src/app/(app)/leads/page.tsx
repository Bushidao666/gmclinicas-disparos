"use client";

import { useState, useMemo } from "react";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Avatar } from "@heroui/avatar";
import { Spinner } from "@heroui/spinner";
import { 
  Users, 
  Search, 
  TrendingUp,
} from "lucide-react";

import { useClients } from "@/hooks/useClients";
import { useLeadsStats } from "@/hooks/useLeadsStats";
import { LeadsManagementModal } from "@/components/LeadsManagementModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface ClientWithStats {
  id: string;
  name: string;
  photo_url: string | null;
  email: string | null;
  totalLeads: number;
  activeLeads: number;
  optedOutLeads: number;
  growthRate: number;
}

function ClientCard({ 
  client, 
  onClick 
}: { 
  client: ClientWithStats; 
  onClick: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
      isPressable
      onPress={onClick}
    >
      <CardBody className="p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={client.photo_url || undefined}
            name={client.name}
            size="lg"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{client.name}</h3>
            {client.email && (
              <p className="text-sm text-gray-600 truncate">{client.email}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-semibold">{client.totalLeads.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Ativos</p>
                <p className="text-lg font-semibold text-success">{client.activeLeads.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Opt-outs</p>
                <p className="text-lg font-semibold text-danger">{client.optedOutLeads.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Crescimento</p>
                <div className="flex items-center gap-1">
                  <p className="text-lg font-semibold">
                    {client.growthRate > 0 ? "+" : ""}{client.growthRate.toFixed(1)}%
                  </p>
                  <TrendingUp 
                    className={`w-4 h-4 ${client.growthRate > 0 ? "text-success" : client.growthRate < 0 ? "text-danger rotate-180" : "text-gray-400"}`} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ClientCardWithStats({ 
  client, 
  onClick 
}: { 
  client: { id: string; name: string; photo_url: string | null; email: string | null }; 
  onClick: () => void;
}) {
  const { data: stats } = useLeadsStats(client.id);
  
  const clientWithStats: ClientWithStats = {
    ...client,
    totalLeads: stats?.totalLeads ?? 0,
    activeLeads: stats?.activeLeads ?? 0,
    optedOutLeads: stats?.optedOutLeads ?? 0,
    growthRate: stats?.growthRate ?? 0,
  };

  return <ClientCard client={clientWithStats} onClick={onClick} />;
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Buscar clientes com paginação se necessário
  const { data: clientsData, isLoading } = useClients({
    search: debouncedSearch,
    page: 1,
    pageSize: 100, // Carregar até 100 clientes por vez
  });

  const clients = useMemo(() => {
    if (!clientsData?.items) return [];
    return clientsData.items;
  }, [clientsData]);

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciamento de Leads</h1>
            <p className="text-sm text-gray-600 mt-1">
              Clique em um cliente para gerenciar seus leads
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        {/* Cards de Clientes */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardBody className="text-center py-20">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {debouncedSearch 
                  ? "Nenhum cliente encontrado com este nome" 
                  : "Nenhum cliente cadastrado ainda"}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clients.map((client) => (
              <ClientCardWithStats
                key={client.id}
                client={client}
                onClick={() => setSelectedClientId(client.id)}
              />
            ))}
          </div>
        )}

        {/* Modal de gerenciamento */}
        {selectedClientId && (
          <LeadsManagementModal
            isOpen={!!selectedClientId}
            onClose={() => setSelectedClientId(null)}
            clientId={selectedClientId}
          />
        )}
      </div>
    </main>
  );
}
