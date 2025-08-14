"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface RealtimeContextType {
  isConnected: boolean;
  globalChannel: RealtimeChannel | null;
  sendBroadcast: (event: string, payload: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  globalChannel: null,
  sendBroadcast: () => {},
});

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [globalChannel, setGlobalChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createSupabaseClient();

  useEffect(() => {
    // Criar canal global para broadcasts e notificações
    const channel = supabase
      .channel("global-notifications", {
        config: {
          broadcast: {
            self: true, // Receber próprias mensagens
            ack: true,  // Aguardar confirmação do servidor
          },
        },
      })
      .on("broadcast", { event: "notification" }, (payload) => {
        console.log("📢 Global notification:", payload);
        // Aqui você pode mostrar um toast ou notificação
      })
      .on("broadcast", { event: "system-alert" }, (payload) => {
        console.log("🚨 System alert:", payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Connected to Realtime");
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Realtime connection error");
          setIsConnected(false);
        } else if (status === "CLOSED") {
          console.log("🔒 Realtime connection closed");
          setIsConnected(false);
        }
      });

    setGlobalChannel(channel);

    // Configurar heartbeat para manter conexão ativa
    const heartbeatInterval = setInterval(() => {
      if (channel.state === "joined") {
        channel.send({
          type: "broadcast",
          event: "heartbeat",
          payload: { timestamp: new Date().toISOString() },
        });
      }
    }, 30000); // A cada 30 segundos

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const sendBroadcast = (event: string, payload: any) => {
    if (globalChannel && globalChannel.state === "joined") {
      globalChannel.send({
        type: "broadcast",
        event,
        payload,
      });
    } else {
      console.warn("Cannot send broadcast: channel not connected");
    }
  };

  return (
    <RealtimeContext.Provider value={{ isConnected, globalChannel, sendBroadcast }}>
      {children}
    </RealtimeContext.Provider>
  );
}