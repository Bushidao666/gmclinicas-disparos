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

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["inbox", selectedClientId, responseFilter],
    queryFn: async () => {
      let query = supabase
        .from("messages_inbound")
        .select(
          `
          *,
          lead:leads(*),
          client:clients(name),
          responses:responses(type, detected_by)
        `,
        )
        .order("received_at", { ascending: false })
        .limit(100);

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

      const { data, error } = await query;

      if (error) throw error;

      return data as InboundMessage[];
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

  const filteredMessages = messages.filter((msg) => {
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
            >
              <SelectItem key="" value="">
                Todos os clientes
              </SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              className="max-w-xs"
              label="Tipo de Resposta"
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value as any)}
            >
              <SelectItem key="all" value="all">
                Todas
              </SelectItem>
              <SelectItem key="positive" value="positive">
                Interessados
              </SelectItem>
              <SelectItem key="unsubscribe" value="unsubscribe">
                Descadastros
              </SelectItem>
              <SelectItem key="unanswered" value="unanswered">
                Sem classificação
              </SelectItem>
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
