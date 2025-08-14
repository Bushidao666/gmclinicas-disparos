"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
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
import { ptBR } from "date-fns/locale";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { useClients } from "@/hooks/useClients";

interface Appointment {
  id: string;
  client_id: string;
  lead_id: string | null;
  status: "pending" | "confirmed" | "canceled" | "no_show" | "done";
  scheduled_at: string | null;
  notes: string | null;
  created_at: string;
  client: {
    name: string;
  };
  lead?: {
    full_name: string;
    whatsapp_e164: string;
  };
}

const statusOptions = [
  { value: "pending", label: "Pendente", color: "warning" as const },
  { value: "confirmed", label: "Confirmado", color: "primary" as const },
  { value: "canceled", label: "Cancelado", color: "danger" as const },
  { value: "no_show", label: "Não compareceu", color: "default" as const },
  { value: "done", label: "Realizado", color: "success" as const },
];

export default function AppointmentsPage() {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();
  const { data: clients } = useClients();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form states for editing
  const [editStatus, setEditStatus] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", selectedClientId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          client:clients(name),
          lead:leads(full_name, whatsapp_e164)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Appointment[];
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppointment) return;

      let scheduled_at = null;

      if (editDate && editTime) {
        scheduled_at = new Date(`${editDate}T${editTime}`).toISOString();
      }

      const { error } = await supabase
        .from("appointments")
        .update({
          status: editStatus,
          scheduled_at,
          notes: editNotes,
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setEditMode(false);
      onOpenChange();
    },
  });

  const getStatusChip = (status: Appointment["status"]) => {
    const option = statusOptions.find((o) => o.value === status);

    return (
      <Chip color={option?.color} size="sm" variant="flat">
        {option?.label}
      </Chip>
    );
  };

  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditStatus(appointment.status);
    setEditNotes(appointment.notes || "");

    if (appointment.scheduled_at) {
      const date = new Date(appointment.scheduled_at);

      setEditDate(format(date, "yyyy-MM-dd"));
      setEditTime(format(date, "HH:mm"));
    } else {
      setEditDate("");
      setEditTime("");
    }

    setEditMode(false);
    onOpen();
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">Agendamentos</h1>
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
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <SelectItem key="all" value="all">
                Todos
              </SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <Table aria-label="Agendamentos">
              <TableHeader>
                <TableColumn>Cliente</TableColumn>
                <TableColumn>Lead</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Data/Hora Agendada</TableColumn>
                <TableColumn>Criado em</TableColumn>
                <TableColumn>Ações</TableColumn>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.client?.name}</TableCell>
                    <TableCell>
                      {appointment.lead ? (
                        <div>
                          <p className="font-medium">
                            {appointment.lead.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {appointment.lead.whatsapp_e164}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(appointment.status)}</TableCell>
                    <TableCell>
                      {appointment.scheduled_at ? (
                        format(
                          new Date(appointment.scheduled_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR },
                        )
                      ) : (
                        <span className="text-gray-400">Não agendado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(appointment.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => openAppointmentDetails(appointment)}
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
              <ModalHeader>
                {editMode ? "Editar Agendamento" : "Detalhes do Agendamento"}
              </ModalHeader>
              <ModalBody>
                {selectedAppointment && (
                  <div className="space-y-4">
                    {!editMode ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Cliente</p>
                          <p className="font-medium">
                            {selectedAppointment.client?.name}
                          </p>
                        </div>

                        {selectedAppointment.lead && (
                          <div>
                            <p className="text-sm text-gray-500">Lead</p>
                            <p className="font-medium">
                              {selectedAppointment.lead.full_name || "Sem nome"}
                            </p>
                            <p className="text-sm">
                              {selectedAppointment.lead.whatsapp_e164}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          {getStatusChip(selectedAppointment.status)}
                        </div>

                        {selectedAppointment.scheduled_at && (
                          <div>
                            <p className="text-sm text-gray-500">
                              Data/Hora Agendada
                            </p>
                            <p>
                              {format(
                                new Date(selectedAppointment.scheduled_at),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR },
                              )}
                            </p>
                          </div>
                        )}

                        {selectedAppointment.notes && (
                          <div>
                            <p className="text-sm text-gray-500">Observações</p>
                            <p className="bg-gray-100 p-3 rounded-lg whitespace-pre-wrap">
                              {selectedAppointment.notes}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-500">Criado em</p>
                          <p>
                            {format(
                              new Date(selectedAppointment.created_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Select
                          label="Status"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>

                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Data"
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                          <Input
                            label="Hora"
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                          />
                        </div>

                        <Textarea
                          label="Observações"
                          minRows={3}
                          placeholder="Adicione observações sobre o agendamento..."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {!editMode ? (
                  <>
                    <Button variant="flat" onPress={() => setEditMode(true)}>
                      Editar
                    </Button>
                    <Button variant="light" onPress={onClose}>
                      Fechar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="light" onPress={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button
                      color="primary"
                      isLoading={updateAppointmentMutation.isPending}
                      onPress={() => updateAppointmentMutation.mutate()}
                    >
                      Salvar
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
