"use client";

import type { Database } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

export function useClients() {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<
      Database["public"]["Tables"]["clients"]["Row"][]
    > => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,photo_url")
        .order("name");

      if (error) throw error;

      return data ?? [];
    },
  });
}
