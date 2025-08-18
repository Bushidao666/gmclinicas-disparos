"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import Image from "next/image";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useClients } from "@/hooks/useClients";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CreateClientModal } from "@/components/CreateClientModal";
import { ClientDetailsModal } from "@/components/ClientDetailsModal";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Client {
  id: string;
  name: string;
  photo_url: string | null;
  email: string | null;
  user_id: string | null;
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 400);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useClients({ page, pageSize, search: debouncedFilter });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // 🔥 REALTIME: Escutar mudanças na tabela clients
  useRealtimeSubscription({
    channel: "clients-changes",
    table: "clients",
    onInsert: (payload) => {
      // Atualizar cache do React Query otimisticamente
      queryClient.setQueryData(["clients"], (old: Client[] | undefined) => {
        if (!old) return [payload.new as Client];

        return [...old, payload.new as Client].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
    },
    onUpdate: (payload) => {
      // Atualizar cache do React Query
      queryClient.setQueryData(["clients"], (old: Client[] | undefined) => {
        if (!old) return [payload.new as Client];

        return old
          .map((client) =>
            client.id === (payload.new as Client).id
              ? (payload.new as Client)
              : client,
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      });
    },
    onDelete: (payload) => {
      // Remover do cache
      queryClient.setQueryData(["clients"], (old: Client[] | undefined) => {
        if (!old) return [];

        return old.filter((client) => client.id !== (payload.old as Client).id);
      });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50/20 via-background to-primary-100/10 dark:from-primary-900/10 dark:via-background dark:to-primary-800/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        {/* Header com Glass Effect Refinado */}
        <div className="glass-subtle rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                Clientes
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-lg shadow-success/50"></div>
                  <span className="text-sm text-success font-medium">Realtime ativo</span>
                </div>
                <span className="text-xs text-arsenic-300 dark:text-arsenic-400">|  Gerencie sua base de clientes</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="glass-input rounded-xl px-4 py-2 backdrop-blur-md min-w-[250px]">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-arsenic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Buscar cliente..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-transparent"
                    classNames={{
                      input: "bg-transparent placeholder:text-arsenic-300 text-foreground",
                      inputWrapper: "bg-transparent shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent"
                    }}
                  />
                </div>
              </div>
              <Button 
                color="primary" 
                size="lg"
                onPress={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-primary to-primary-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                startContent={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Novo Cliente
              </Button>
            </div>
          </div>
        </div>

      {/* Tabela com glass effect */}
      <div className="glass-card rounded-2xl p-6 animate-slideInLeft">
        <Table 
          aria-label="Lista de clientes"
          classNames={{
            wrapper: "bg-transparent",
            th: "bg-primary/10 text-primary font-semibold",
            td: "text-arsenic-500 dark:text-arsenic-300"
          }}
        >
          <TableHeader>
            <TableColumn>CLIENTE</TableColumn>
            <TableColumn>EMAIL</TableColumn>
            <TableColumn>FOTO</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>AÇÕES</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={isLoading ? "Carregando..." : "Nenhum cliente"}
            isLoading={isLoading}
            items={items}
          >
            {(item) => (
              <TableRow 
                key={item.id}
                className="cursor-pointer hover:bg-primary/5 transition-all duration-300 group"
                onClick={() => setSelectedClientId(item.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.photo_url ? (
                      <div className="relative">
                        <Image
                          alt={item.name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300"
                          height={40}
                          src={item.photo_url}
                          width={40}
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                        <span className="text-sm font-bold text-primary">
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-gm-black dark:text-white group-hover:text-primary transition-colors duration-300">
                      {item.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{item.email || '-'}</span>
                </TableCell>
                <TableCell>
                  {item.photo_url ? (
                    <Chip color="success" size="sm" variant="dot">
                      Com foto
                    </Chip>
                  ) : (
                    <Chip color="default" size="sm" variant="dot">
                      Sem foto
                    </Chip>
                  )}
                </TableCell>
                <TableCell>
                  {item.user_id ? (
                    <Chip color="success" size="sm" className="glow-success" variant="flat">
                      Ativo
                    </Chip>
                  ) : (
                    <Chip color="warning" size="sm" variant="flat">
                      Sem acesso
                    </Chip>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-primary hover:bg-primary/10 transition-all duration-300"
                    onPress={() => setSelectedClientId(item.id)}
                    startContent={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    }
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação com glass */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between animate-fadeIn">
        <div className="text-sm text-arsenic-500 dark:text-arsenic-300 font-medium">
          Mostrando <span className="text-primary font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-primary font-bold">{Math.min(page * pageSize, total)}</span> de <span className="text-primary font-bold">{total}</span> clientes
        </div>
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="flat"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            className="glass-button"
          >
            ← Anterior
          </Button>
          <div className="px-4 py-2 glass rounded-lg">
            <span className="text-sm font-medium">Página <span className="text-primary font-bold">{page}</span> de <span className="text-primary font-bold">{totalPages}</span></span>
          </div>
          <Button
            size="sm"
            variant="flat"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="glass-button"
          >
            Próxima →
          </Button>
        </div>
      </div>

      {/* Modais */}
      <CreateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      {selectedClientId && (
        <ClientDetailsModal
          clientId={selectedClientId}
          isOpen={!!selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
    </main>
  );
}
