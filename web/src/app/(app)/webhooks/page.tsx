"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { useState } from "react";
import { format } from "date-fns";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";

interface WebhookEvent {
  id: string;
  client_id: string | null;
  evoapi_instance_id: string | null;
  event_type: string;
  raw_json: any;
  signature_valid: boolean;
  received_at: string;
  client?: { name: string };
  instance?: { name: string; instance_id: string };
}

export default function WebhooksPage() {
  const supabase = createSupabaseClient();
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["webhook-events", selectedClientId],
    queryFn: async (): Promise<WebhookEvent[]> => {
      let query = supabase
        .from("webhook_events")
        .select(`
          *,
          client:clients(name),
          instance:evoapi_instances(name, instance_id)
        `)
        .order("received_at", { ascending: false })
        .limit(100);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
  });

  const { data: responses } = useQuery({
    queryKey: ["webhook-responses", selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from("responses")
        .select(`
          *,
          lead:leads(full_name, whatsapp_e164)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="p-6 grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Monitoramento de Webhooks</h1>
        <Select
          className="max-w-xs"
          label="Filtrar por cliente"
          aria-label="Filtrar por cliente"
          selectedKeys={selectedClientId ? [selectedClientId] : []}
          onChange={(e) => setSelectedClientId(e.target.value)}
        >
          <SelectItem key="" value="">
            Todos os clientes
          </SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} textValue={c.name} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Respostas Detectadas</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {responses?.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-content2 rounded">
                  <div>
                    <p className="font-medium">
                      {r.lead?.full_name || r.lead?.whatsapp_e164}
                    </p>
                    <p className="text-sm text-default-500">
                      {r.matched_text && `"${r.matched_text}"`}
                    </p>
                  </div>
                  <Chip
                    color={r.type === "positive" ? "success" : r.type === "unsubscribe" ? "danger" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {r.type === "positive" ? "Interessado" : r.type === "unsubscribe" ? "Sair" : r.type}
                  </Chip>
                </div>
              ))}
              {(!responses || responses.length === 0) && (
                <p className="text-default-500 text-center py-4">Nenhuma resposta ainda</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Estatísticas</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-default-500">Total de Eventos</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Respostas Positivas</p>
                <p className="text-2xl font-bold text-success">
                  {responses?.filter((r: any) => r.type === "positive").length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-default-500">Desinscrições</p>
                <p className="text-2xl font-bold text-danger">
                  {responses?.filter((r: any) => r.type === "unsubscribe").length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-default-500">Assinatura Válida</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.signature_valid).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Últimos Eventos de Webhook</h2>
        </CardHeader>
        <CardBody>
          <Table aria-label="Eventos de webhook">
            <TableHeader>
              <TableColumn>Data/Hora</TableColumn>
              <TableColumn>Cliente</TableColumn>
              <TableColumn>Instância</TableColumn>
              <TableColumn>Tipo</TableColumn>
              <TableColumn>Assinatura</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? "Carregando..." : "Nenhum evento"}
              isLoading={isLoading}
              items={events}
            >
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {format(new Date(item.received_at), "dd/MM HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {item.client?.name || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {item.instance?.name || item.instance?.instance_id || "—"}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {item.event_type}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={item.signature_valid ? "success" : "danger"}
                      size="sm"
                      variant="dot"
                    >
                      {item.signature_valid ? "Válida" : "Inválida"}
                    </Chip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </main>
  );
}