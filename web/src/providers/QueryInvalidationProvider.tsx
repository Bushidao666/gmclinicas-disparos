"use client";

import { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface QueryInvalidationProviderProps {
  children: ReactNode;
}

/**
 * Centraliza assinaturas Realtime e invalidações de cache por tabela/evento.
 * Evita duplicação de lógica de realtime em cada página.
 */
export function QueryInvalidationProvider({ children }: QueryInvalidationProviderProps) {
  const queryClient = useQueryClient();

  // Mensagens enviadas: impacta métricas de dashboard (cards e séries), métricas de campanhas
  useRealtimeSubscription({
    channel: "qi-messages-outbound",
    table: "messages_outbound",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-general-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-daily-messages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-campaign-metrics"] });
    },
  });

  // Mensagens recebidas: impacta métricas de dashboard (cards e séries)
  useRealtimeSubscription({
    channel: "qi-messages-inbound",
    table: "messages_inbound",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-general-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-daily-messages"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  // Respostas: impacta métricas de respostas
  useRealtimeSubscription({
    channel: "qi-responses",
    table: "responses",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-general-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-response-types"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  // Appointments: impacta cards de agendamentos
  useRealtimeSubscription({
    channel: "qi-appointments",
    table: "appointments",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-general-metrics"] });
    },
  });

  // Campanhas e targets: impacta lista de campanhas e "recent-campaigns" no dashboard
  useRealtimeSubscription({
    channel: "qi-campaigns",
    table: "campaigns",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-campaigns"] });
    },
  });
  useRealtimeSubscription({
    channel: "qi-campaign-targets",
    table: "campaign_targets",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-campaigns"] });
    },
  });

  return <>{children}</>;
}

