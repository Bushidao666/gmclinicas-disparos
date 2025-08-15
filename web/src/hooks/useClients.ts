"use client";

import type { Database } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

// Overload 1: lista simples (sem paginação)
export function useClients(): ReturnType<typeof useQuery<Database["public"]["Tables"]["clients"]["Row"][]>>;
// Overload 2: paginação e busca
export function useClients(params: { page?: number; pageSize?: number; search?: string }): ReturnType<typeof useQuery<{ items: Database["public"]["Tables"]["clients"]["Row"][]; total: number }>>;
export function useClients(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const supabase = createSupabaseClient();
  const { page, pageSize, search = "" } = params;
  const isPaged = typeof pageSize === "number" || search !== "" || (typeof page === "number" && page > 1);

  if (!isPaged) {
    // Lista simples: mantém compatibilidade com chamadas existentes
    return useQuery({
      queryKey: ["clients", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("clients")
          .select("id,name,photo_url,email,user_id")
          .order("name");

        if (error) throw error;
        return data ?? [];
      },
    });
  }

  const currentPage = page ?? 1;
  const currentPageSize = pageSize ?? 20;
  const from = (currentPage - 1) * currentPageSize;
  const to = from + currentPageSize - 1;

  return useQuery({
    queryKey: ["clients", currentPage, currentPageSize, search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("id,name,photo_url,email,user_id", { count: "exact" })
        .order("name");

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return { items: data ?? [], total: count ?? 0 };
    },
  });
}
