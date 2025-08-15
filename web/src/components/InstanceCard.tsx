"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Wifi, WifiOff, Save, Webhook, User, Globe, Calendar } from "lucide-react";

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

export function InstanceCard({
  instance,
  clients,
  onUpdate,
}: InstanceCardProps) {
  const supabase = createSupabaseClient();
  const [selectedClientId, setSelectedClientId] = useState<string>(
    instance.client_id || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
        "Tem certeza que deseja desvincular este cliente da instância?",
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
      // Erro ao salvar
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

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <Card className="w-full max-w-sm hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardHeader className="flex justify-between items-start pb-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {instance.name || instance.instance_id}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {instance.instance_id}
          </p>
        </div>
        <Chip
          color={isConnected ? "success" : "warning"}
          size="sm"
          variant="flat"
          startContent={isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        >
          {isConnected ? "Conectada" : "Desconectada"}
        </Chip>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Status da conexão */}
        {instance.last_connected_at && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>
              Última conexão:{" "}
              {new Date(instance.last_connected_at).toLocaleString("pt-BR")}
            </span>
          </div>
        )}

        {/* Seleção de Cliente */}
        <div className="space-y-2">
          <label htmlFor={`client-select-${instance.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            Cliente Vinculado
          </label>
          <select
            id={`client-select-${instance.id}`}
            className={`w-full px-3 py-2 border rounded-lg text-sm transition-all duration-200 ${
              isDirty
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
            } ${!selectedClientId ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
            disabled={isSaving}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
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
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all">
              {selectedClient.photo_url ? (
                <Image
                  alt={selectedClient.name}
                  className="rounded-full object-cover"
                  src={selectedClient.photo_url}
                  width={24}
                  height={24}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                  {selectedClient.name[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedClient.name}</span>
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
            className="flex-1 transition-all"
            color="primary"
            isDisabled={!isDirty}
            isLoading={isSaving}
            size="sm"
            variant={isDirty ? "solid" : "flat"}
            startContent={!isSaving && isDirty && <Save className="w-4 h-4" />}
            onPress={handleSave}
          >
            {isDirty ? "Salvar" : "Atualizado"}
          </Button>

          <Button
            color="secondary"
            isLoading={isConfiguringWebhook}
            size="sm"
            variant="flat"
            startContent={!isConfiguringWebhook && <Webhook className="w-4 h-4" />}
            onPress={handleConfigureWebhook}
          >
            Webhook
          </Button>
        </div>

        {/* Base URL */}
        {instance.base_url && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Base URL:</p>
            </div>
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
              {instance.base_url}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
