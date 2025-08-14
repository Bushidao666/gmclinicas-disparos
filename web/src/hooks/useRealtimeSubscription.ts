"use client";

import { useEffect, useRef } from "react";
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { createSupabaseClient } from "@/lib/supabaseClient";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeSubscriptionOptions {
  channel: string;
  table?: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  channel,
  table,
  schema = "public",
  event = "*",
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Criar canal
    channelRef.current = supabase.channel(channel);

    // Configurar listeners para mudanças no banco
    if (table) {
      const postgresChangesConfig: any = {
        event,
        schema,
        table,
      };

      if (filter) {
        postgresChangesConfig.filter = filter;
      }

      channelRef.current.on(
        "postgres_changes",
        postgresChangesConfig,
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Chamar callback geral
          onChange?.(payload);

          // Chamar callbacks específicos por tipo de evento
          switch (payload.eventType) {
            case "INSERT":
              onInsert?.(payload);
              break;
            case "UPDATE":
              onUpdate?.(payload);
              break;
            case "DELETE":
              onDelete?.(payload);
              break;
          }
        },
      );
    }

    // Inscrever no canal
    channelRef.current.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`✅ Subscribed to channel: ${channel}`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`❌ Error subscribing to channel: ${channel}`);
      } else if (status === "TIMED_OUT") {
        console.error(`⏱️ Subscription timed out for channel: ${channel}`);
      } else if (status === "CLOSED") {
        console.log(`🔒 Channel closed: ${channel}`);
      }
    });

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log(`🧹 Unsubscribing from channel: ${channel}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    channel,
    table,
    schema,
    event,
    filter,
    enabled,
    supabase,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  ]);

  return {
    channel: channelRef.current,
    isSubscribed: channelRef.current?.state === "joined",
  };
}

// Hook para broadcast (mensagens rápidas entre clientes)
export function useRealtimeBroadcast(
  channelName: string,
  onMessage?: (payload: any) => void,
  enabled = true,
) {
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    channelRef.current = supabase.channel(channelName);

    if (onMessage) {
      channelRef.current.on("broadcast", { event: "*" }, onMessage);
    }

    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, enabled, supabase, onMessage]);

  const send = (event: string, payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
    }
  };

  return { send, channel: channelRef.current };
}

// Hook para presence (status online de usuários)
export function useRealtimePresence(
  channelName: string,
  userState: any,
  enabled = true,
) {
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    channelRef.current = supabase.channel(channelName);

    channelRef.current
      .on("presence", { event: "sync" }, () => {
        const state = channelRef.current?.presenceState();

        console.log("Presence state:", state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && userState) {
          await channelRef.current?.track(userState);
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, userState, enabled, supabase]);

  return {
    channel: channelRef.current,
    presenceState: channelRef.current?.presenceState() || {},
  };
}
