"use client";

import type { Database } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface UseLeadsByClientParams {
  clientId: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
  includeOptedOut?: boolean;
  tags?: string[];
}

interface UseLeadsByClientReturn {
  items: Lead[];
  total: number;
  totalOptedOut: number;
  totalActive: number;
}

export function useLeadsByClient({
  clientId,
  page = 1,
  pageSize = 50,
  search = "",
  includeOptedOut = true,
  tags = [],
}: UseLeadsByClientParams) {
  const supabase = createSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ["leads", clientId, page, pageSize, search, includeOptedOut, tags],
    queryFn: async (): Promise<UseLeadsByClientReturn> => {
      if (!clientId) {
        return { items: [], total: 0, totalOptedOut: 0, totalActive: 0 };
      }

      // Query principal para buscar leads
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      // Filtro de opt-out
      if (!includeOptedOut) {
        query = query.eq("is_opted_out", false);
      }

      // Filtro de busca (nome ou telefone)
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,whatsapp_e164.ilike.%${search}%`);
      }

      // Filtro de tags
      if (tags.length > 0) {
        query = query.contains("tags", tags);
      }

      // Paginação
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // Buscar estatísticas totais
      const [optedOutResult, activeResult] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId)
          .eq("is_opted_out", true),
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId)
          .eq("is_opted_out", false),
      ]);

      return {
        items: data ?? [],
        total: count ?? 0,
        totalOptedOut: optedOutResult.count ?? 0,
        totalActive: activeResult.count ?? 0,
      };
    },
    enabled: !!clientId,
  });
}