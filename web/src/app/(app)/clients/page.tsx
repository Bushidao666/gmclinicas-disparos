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
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useClients } from "@/hooks/useClients";
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
  const { data = [], isLoading } = useClients();
  const [filter, setFilter] = useState("");
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

  const rows = useMemo(
    () =>
      data.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())),
    [data, filter],
  );

  return (
    <main className="p-6 grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-xs text-green-600">
            🟢 Realtime ativo - Atualizações automáticas
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filtrar por nome"
            size="sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button color="primary" onPress={() => setIsModalOpen(true)}>
            Novo Cliente
          </Button>
        </div>
      </div>

      <div className="bg-content1 rounded-large p-2">
        <Table aria-label="Lista de clientes">
          <TableHeader>
            <TableColumn>Nome</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Foto</TableColumn>
            <TableColumn>Acesso</TableColumn>
            <TableColumn>Ações</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={isLoading ? "Carregando..." : "Nenhum cliente"}
            isLoading={isLoading}
            items={rows}
          >
            {(item) => (
              <TableRow 
                key={item.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setSelectedClientId(item.id)}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.email || '-'}</TableCell>
                <TableCell>
                  {item.photo_url ? (
                    <Image
                      alt={item.name}
                      className="h-8 w-8 rounded-full object-cover"
                      height={32}
                      src={item.photo_url}
                      width={32}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.user_id ? (
                    <Chip color="success" size="sm" variant="flat">
                      Ativo
                    </Chip>
                  ) : (
                    <Chip color="default" size="sm" variant="flat">
                      Sem acesso
                    </Chip>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setSelectedClientId(item.id)}
                  >
                    Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
    </main>
  );
}
