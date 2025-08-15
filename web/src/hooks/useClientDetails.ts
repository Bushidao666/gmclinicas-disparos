import { useQuery } from "@tanstack/react-query";

import { createSupabaseClient } from "@/lib/supabaseClient";

interface ClientDetails {
  id: string;
  name: string;
  photo_url: string | null;
  email: string | null;
  user_id: string | null;
  created_at: string;
  metrics: {
    totalLeads: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalInstances: number;
    connectedInstances: number;
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalResponses: number;
    positiveResponses: number;
    unsubscribes: number;
  };
}

export function useClientDetails(clientId: string | null) {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["client-details", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Buscar dados básicos do cliente
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;

      // Buscar métricas agregadas
      const [
        leadsResult,
        campaignsResult,
        instancesResult,
        messagesOutResult,
        messagesInResult,
        responsesResult,
      ] = await Promise.all([
        // Total de leads
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId),
        
        // Campanhas
        supabase
          .from("campaigns")
          .select("id, status")
          .eq("client_id", clientId),
        
        // Instâncias
        supabase
          .from("evoapi_instances")
          .select("id, status")
          .eq("client_id", clientId),
        
        // Mensagens enviadas
        supabase
          .from("messages_outbound")
          .select("id", { count: "exact" })
          .eq("client_id", clientId),
        
        // Mensagens recebidas
        supabase
          .from("messages_inbound")
          .select("id", { count: "exact" })
          .eq("client_id", clientId),
        
        // Respostas
        supabase
          .from("responses")
          .select("id, type")
          .eq("client_id", clientId),
      ]);

      const campaigns = campaignsResult.data || [];
      const instances = instancesResult.data || [];
      const responses = responsesResult.data || [];

      const metrics = {
        totalLeads: leadsResult.count || 0,
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === "active").length,
        totalInstances: instances.length,
        connectedInstances: instances.filter(i => i.status === "connected").length,
        totalMessagesSent: messagesOutResult.count || 0,
        totalMessagesReceived: messagesInResult.count || 0,
        totalResponses: responses.length,
        positiveResponses: responses.filter(r => r.type === "positive").length,
        unsubscribes: responses.filter(r => r.type === "unsubscribe").length,
      };

      return {
        ...client,
        metrics,
      } as ClientDetails;
    },
    enabled: !!clientId,
  });
}