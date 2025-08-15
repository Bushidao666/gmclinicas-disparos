"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";

interface InboundMessage {
  id: string;
  client_id: string;
  lead_id: string;
  text_content: string;
  received_at: string;
  lead: {
    full_name: string;
    whatsapp_e164: string;
    is_opted_out: boolean;
  };
  client: {
    name: string;
  };
  responses: Array<{
    type: "unsubscribe" | "positive" | "other";
    detected_by: string;
  }>;
}

export default function InboxPage() {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();
  const { data: clients } = useClients();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [responseFilter, setResponseFilter] = useState<
    "all" | "unsubscribe" | "positive" | "unanswered"
  >("all");
  const [selectedMessage, setSelectedMessage] = useState<InboundMessage | null>(
    null,
  );

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { data: messages, isLoading } = useQuery({
    queryKey: ["inbox", selectedClientId, responseFilter, page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("messages_inbound")
        .select(
          `
          id, client_id, lead_id, text_content, received_at,
          lead:leads(full_name, whatsapp_e164, is_opted_out),
          client:clients(name),
          responses:responses(type, detected_by)
        `,
          { count: "exact" },
        )
        .order("received_at", { ascending: false })
        .range(from, to);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      if (responseFilter === "unsubscribe") {
        query = query.eq("responses.type", "unsubscribe");
      } else if (responseFilter === "positive") {
        query = query.eq("responses.type", "positive");
      } else if (responseFilter === "unanswered") {
        query = query.is("responses", null);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const items: InboundMessage[] = (data || []).map((row: any): InboundMessage => {
        const leadRel = Array.isArray(row.lead) ? row.lead[0] : row.lead;
        const clientRel = Array.isArray(row.client) ? row.client[0] : row.client;
        const responsesRel = Array.isArray(row.responses) ? row.responses : [];

        return {
          id: String(row.id),
          client_id: String(row.client_id),
          lead_id: String(row.lead_id),
          text_content: String(row.text_content ?? ""),
          received_at: String(row.received_at),
          lead: {
            full_name: String(leadRel?.full_name ?? ""),
            whatsapp_e164: String(leadRel?.whatsapp_e164 ?? ""),
            is_opted_out: Boolean(leadRel?.is_opted_out ?? false),
          },
          client: {
            name: String(clientRel?.name ?? ""),
          },
          responses: responsesRel.map((r: any) => ({
            type: r?.type === "unsubscribe" || r?.type === "positive" || r?.type === "other" ? r.type : "other",
            detected_by: String(r?.detected_by ?? ""),
          })),
        };
      });

      return { items, total: count || 0 };
    },
  });

  const markAsPositiveMutation = useMutation({
    mutationFn: async (message: InboundMessage) => {
      const { error: responseError } = await supabase.from("responses").insert({
        client_id: message.client_id,
        lead_id: message.lead_id,
        type: "positive",
        detected_by: "manual",
        matched_text: message.text_content,
      });

      if (responseError) throw responseError;

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          client_id: message.client_id,
          lead_id: message.lead_id,
          status: "pending",
          notes: `Lead interessado: ${message.text_content}`,
        });

      if (appointmentError) throw appointmentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      onOpenChange();
    },
  });

  const markAsUnsubscribeMutation = useMutation({
    mutationFn: async (message: InboundMessage) => {
      const { error: responseError } = await supabase.from("responses").insert({
        client_id: message.client_id,
        lead_id: message.lead_id,
        type: "unsubscribe",
        detected_by: "manual",
        matched_text: message.text_content,
      });

      if (responseError) throw responseError;

      const { error: leadError } = await supabase
        .from("leads")
        .update({ is_opted_out: true })
        .eq("id", message.lead_id);

      if (leadError) throw leadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      onOpenChange();
    },
  });

  const items = messages?.items ?? [];
  const total = messages?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filteredMessages = items.filter((msg) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();

    return (
      msg.text_content?.toLowerCase().includes(search) ||
      msg.lead?.full_name?.toLowerCase().includes(search) ||
      msg.lead?.whatsapp_e164?.includes(search)
    );
  });

  const getResponseChip = (responses: InboundMessage["responses"]) => {
    if (!responses || responses.length === 0) {
      return (
        <Chip size="sm" variant="flat">
          Sem resposta
        </Chip>
      );
    }
    const response = responses[0];

    if (response.type === "positive") {
      return (
        <Chip color="success" size="sm" variant="flat">
          Interessado
        </Chip>
      );
    }
    if (response.type === "unsubscribe") {
      return (
        <Chip color="danger" size="sm" variant="flat">
          Descadastrado
        </Chip>
      );
    }

    return (
      <Chip size="sm" variant="flat">
        Outro
      </Chip>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">
            Inbox - Mensagens Recebidas
          </h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select
              className="max-w-xs"
              label="Filtrar por Cliente"
              placeholder="Todos os clientes"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              items={[{ id: "", name: "Todos os clientes" }, ...(clients || [])]}
            >
              {(item) => (
                <SelectItem key={item.id}>
                  {item.name}
                </SelectItem>
              )}
            </Select>

            <Select
              className="max-w-xs"
              label="Tipo de Resposta"
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value as any)}
              items={[
                { key: "all", label: "Todas" },
                { key: "positive", label: "Interessados" },
                { key: "unsubscribe", label: "Descadastros" },
                { key: "unanswered", label: "Sem classificação" }
              ]}
            >
              {(item) => (
                <SelectItem key={item.key}>
                  {item.label}
                </SelectItem>
              )}
            </Select>

            <Input
              className="max-w-xs"
              label="Buscar"
              placeholder="Nome, telefone ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma mensagem encontrada
            </div>
          ) : (
            <Table aria-label="Mensagens recebidas">
              <TableHeader>
                <TableColumn>Data/Hora</TableColumn>
                <TableColumn>Cliente</TableColumn>
                <TableColumn>Lead</TableColumn>
                <TableColumn>Mensagem</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Ações</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      {format(new Date(msg.received_at), "dd/MM HH:mm")}
                    </TableCell>
                    <TableCell>{msg.client?.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {msg.lead?.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {msg.lead?.whatsapp_e164}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs truncate">
                        {msg.text_content || "-"}
                      </p>
                    </TableCell>
                    <TableCell>{getResponseChip(msg.responses)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          setSelectedMessage(msg);
                          onOpen();
                        }}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between mt-4 text-sm text-default-500">
        <div>
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="flat"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalhes da Mensagem</ModalHeader>
              <ModalBody>
                {selectedMessage && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Lead</p>
                      <p className="font-medium">
                        {selectedMessage.lead?.full_name || "Sem nome"}
                      </p>
                      <p className="text-sm">
                        {selectedMessage.lead?.whatsapp_e164}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Mensagem</p>
                      <p className="bg-gray-100 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedMessage.text_content ||
                          "Sem conteúdo de texto"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Recebida em</p>
                      <p>
                        {format(
                          new Date(selectedMessage.received_at),
                          "dd/MM/yyyy HH:mm:ss",
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-2">Status Atual</p>
                      {getResponseChip(selectedMessage.responses)}
                    </div>

                    {(!selectedMessage.responses ||
                      selectedMessage.responses.length === 0) && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-3">
                          Classificar Resposta
                        </p>
                        <div className="flex gap-3">
                          <Button
                            color="success"
                            isLoading={markAsPositiveMutation.isPending}
                            variant="flat"
                            onPress={() =>
                              markAsPositiveMutation.mutate(selectedMessage)
                            }
                          >
                            Marcar como Interessado
                          </Button>
                          <Button
                            color="danger"
                            isLoading={markAsUnsubscribeMutation.isPending}
                            variant="flat"
                            onPress={() =>
                              markAsUnsubscribeMutation.mutate(selectedMessage)
                            }
                          >
                            Marcar como Descadastro
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Fechar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
