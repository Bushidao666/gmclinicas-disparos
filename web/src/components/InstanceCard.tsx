"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Client {
  id: string;
  name: string;
  photo_url: string | null;
}

interface Instance {
  id: string;
  instance_id: string;
  name: string | null;
  base_url: string | null;
  client_id: string | null;
  status?: string;
  last_connected_at?: string | null;
}

interface InstanceCardProps {
  instance: Instance;
  clients: Client[];
  onUpdate?: () => void;
}

export function InstanceCard({ instance, clients, onUpdate }: InstanceCardProps) {
  const supabase = createSupabaseClient();
  const [selectedClientId, setSelectedClientId] = useState<string>(instance.client_id || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Atualizar quando a instância mudar (via Realtime)
  useEffect(() => {
    setSelectedClientId(instance.client_id || "");
  }, [instance.client_id]);

  const isDirty = selectedClientId !== (instance.client_id || "");
  const isConnected = instance.status === "connected";

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    // Confirmar desvinculação
    if (instance.client_id && !selectedClientId) {
      const confirm = window.confirm(
        "Tem certeza que deseja desvincular este cliente da instância?"
      );
      if (!confirm) {
        setSelectedClientId(instance.client_id);
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("evoapi_instances")
        .update({ client_id: selectedClientId || null })
        .eq("id", instance.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Vínculo atualizado com sucesso!" });
      setTimeout(() => setMessage(null), 3000);
      onUpdate?.();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      setMessage({ type: "error", text: error.message || "Erro ao salvar" });
      setSelectedClientId(instance.client_id || ""); // Reverter
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigureWebhook = async () => {
    setIsConfiguringWebhook(true);
    setMessage(null);

    try {
      const res = await fetch("/api/set-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: instance.instance_id }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao configurar webhook");
      }

      setMessage({ type: "success", text: "Webhook configurado!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Card className="w-full max-w-sm hover:shadow-lg transition-shadow">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">
            {instance.name || instance.instance_id}
          </h3>
          <p className="text-xs text-gray-500 font-mono">
            {instance.instance_id}
          </p>
        </div>
        <Chip
          color={isConnected ? "success" : "warning"}
          size="sm"
          variant="dot"
        >
          {isConnected ? "Conectada" : "Desconectada"}
        </Chip>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Status da conexão */}
        {instance.last_connected_at && (
          <div className="text-xs text-gray-500">
            Última conexão: {new Date(instance.last_connected_at).toLocaleString("pt-BR")}
          </div>
        )}

        {/* Seleção de Cliente */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente Vinculado:</label>
          <select
            className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
              isDirty 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            } ${!selectedClientId ? "text-gray-500" : "text-gray-900"}`}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={isSaving}
          >
            <option value="">Sem vínculo</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          {/* Mostrar cliente selecionado */}
          {selectedClient && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              {selectedClient.photo_url ? (
                <img
                  src={selectedClient.photo_url}
                  alt={selectedClient.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                  {selectedClient.name[0]}
                </div>
              )}
              <span className="text-sm">{selectedClient.name}</span>
            </div>
          )}
        </div>

        {/* Mensagens de feedback */}
        {message && (
          <div
            className={`p-2 rounded text-xs ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            size="sm"
            color="primary"
            variant={isDirty ? "solid" : "flat"}
            isDisabled={!isDirty}
            isLoading={isSaving}
            onPress={handleSave}
            className="flex-1"
          >
            {isDirty ? "Salvar Alteração" : "Atualizado"}
          </Button>

          <Button
            size="sm"
            color="secondary"
            variant="flat"
            isLoading={isConfiguringWebhook}
            onPress={handleConfigureWebhook}
          >
            Webhook
          </Button>
        </div>

        {/* Base URL */}
        {instance.base_url && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">Base URL:</p>
            <p className="text-xs font-mono text-gray-700 truncate">
              {instance.base_url}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}