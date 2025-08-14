"use client";

import type { Database } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

type EvoInstance = Database["public"]["Tables"]["evoapi_instances"]["Row"];

// Hook principal para buscar instâncias com filtro opcional por cliente
export function useEvoInstances(clientId?: string) {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["evoapi_instances", clientId ?? "all"],
    queryFn: async (): Promise<EvoInstance[]> => {
      let query = supabase
        .from("evoapi_instances")
        .select("*")
        .order("name", { ascending: true });

      // Se clientId foi fornecido, filtrar apenas as instâncias desse cliente
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data ?? [];
    },
  });
}

// Hook específico para buscar instâncias de um cliente
export function useClientInstances(clientId: string | null | undefined) {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["client_instances", clientId],
    enabled: !!clientId, // Só executa se tiver clientId
    queryFn: async (): Promise<EvoInstance[]> => {
      const { data, error } = await supabase
        .from("evoapi_instances")
        .select("*")
        .eq("client_id", clientId!)
        .order("name", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });
}

// Hook para buscar todas as instâncias (sem filtro)
export function useAllEvoInstances() {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["evoapi_instances", "all"],
    queryFn: async (): Promise<EvoInstance[]> => {
      const { data, error } = await supabase
        .from("evoapi_instances")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });
}
