import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

interface CreateClientInput {
  name: string;
  photo_url?: string;
}

export function useCreateClient() {
  const supabase = createSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      // Autenticação simples: requer usuário logado, sem hierarquia de agência
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: input.name,
          photo_url: input.photo_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      // Invalidar cache de clientes
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
