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
      className="glass-card cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-primary/30 group"
      isPressable
      onPress={onClick}
    >
      <CardBody className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar
              src={client.photo_url || undefined}
              name={client.name}
              size="lg"
              className="flex-shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse border-2 border-white dark:border-gray-800" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate text-gm-black dark:text-white group-hover:text-primary transition-colors duration-300">
              {client.name}
            </h3>
            {client.email && (
              <p className="text-sm text-arsenic-500 dark:text-arsenic-400 truncate">{client.email}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="glass-subtle rounded-lg p-2 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-primary" />
                  <p className="text-xs text-arsenic-400">Total</p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {client.totalLeads.toLocaleString("pt-BR")}
                </p>
              </div>
              
              <div className="glass-subtle rounded-lg p-2 hover:scale-105 transition-all duration-300 border border-success/10">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <p className="text-xs text-arsenic-400">Ativos</p>
                </div>
                <p className="text-lg font-bold text-success">
                  {client.activeLeads.toLocaleString("pt-BR")}
                </p>
              </div>
              
              <div className="glass-subtle rounded-lg p-2 hover:scale-105 transition-all duration-300 border border-danger/10">
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-3 h-3 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="text-xs text-arsenic-400">Opt-outs</p>
                </div>
                <p className="text-lg font-bold text-danger">
                  {client.optedOutLeads.toLocaleString("pt-BR")}
                </p>
              </div>
              
              <div className={`glass-subtle rounded-lg p-2 hover:scale-105 transition-all duration-300 border ${
                client.growthRate > 0 ? 'border-success/20' : client.growthRate < 0 ? 'border-danger/20' : 'border-default/20'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp 
                    className={`w-3 h-3 ${
                      client.growthRate > 0 ? "text-success" : client.growthRate < 0 ? "text-danger rotate-180" : "text-gray-400"
                    }`} 
                  />
                  <p className="text-xs text-arsenic-400">Crescimento</p>
                </div>
                <p className={`text-lg font-bold ${
                  client.growthRate > 0 ? "text-success" : client.growthRate < 0 ? "text-danger" : "text-gray-500"
                }`}>
                  {client.growthRate > 0 ? "+" : ""}{client.growthRate.toFixed(1)}%
                </p>
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
    <main className="min-h-screen bg-gradient-to-br from-primary-50/20 via-background to-primary-100/10 dark:from-primary-900/10 dark:via-background dark:to-primary-800/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com Glass Effect */}
        <div className="glass-card rounded-2xl p-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                Gerenciamento de Leads
              </h1>
              <p className="text-arsenic-500 dark:text-arsenic-400 mt-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Clique em um cliente para gerenciar seus leads
              </p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input w-full sm:w-80"
                classNames={{
                  inputWrapper: "bg-white/10 backdrop-blur-md border-white/20 hover:border-primary/50 pl-10",
                  input: "text-foreground placeholder:text-arsenic-400"
                }}
                startContent={
                  <Search className="w-5 h-5 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                }
              />
              {debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Clientes */}
        {isLoading ? (
          <div className="glass-card rounded-2xl p-20 animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="mt-4 text-arsenic-500 dark:text-arsenic-400 animate-pulse font-medium">
                Carregando clientes...
              </p>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <Card className="glass-card border-dashed border-2 border-primary/20 animate-fadeIn">
            <CardBody className="text-center py-20">
              <div className="p-4 bg-primary/10 rounded-full inline-flex mb-4 animate-pulse">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gm-black dark:text-white mb-2">
                {debouncedSearch 
                  ? "Nenhum cliente encontrado" 
                  : "Nenhum cliente cadastrado"}
              </h3>
              <p className="text-arsenic-500 dark:text-arsenic-400">
                {debouncedSearch 
                  ? `Não encontramos clientes com "${debouncedSearch}"` 
                  : "Adicione clientes para começar a gerenciar leads"}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-animation">
            {clients.map((client, index) => (
              <div
                key={client.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-fadeInUp"
              >
                <ClientCardWithStats
                  client={client}
                  onClick={() => setSelectedClientId(client.id)}
                />
              </div>
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
