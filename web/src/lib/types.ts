// Tipos gerados do Supabase (resumidos para início). Em produção, importe do gerador oficial.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          photo_url: string | null;
        };
      };
      evoapi_instances: {
        Row: {
          id: string;
          client_id: string | null;
          instance_id: string;
          base_url: string;
          name: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          client_id: string;
          full_name: string | null;
          whatsapp_e164: string;
          is_opted_out: boolean;
        };
      };
      campaigns: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          start_at: string;
          daily_volume: number;
          content_type: string;
          caption_text: string | null;
          media_path: string | null;
          evoapi_instance_id: string | null;
          status: string;
        };
      };
      campaign_targets: {
        Row: {
          id: string;
          campaign_id: string;
          lead_id: string;
          scheduled_at: string;
          status: string;
        };
      };
      messages_outbound: {
        Row: {
          id: string;
          client_id: string;
          campaign_id: string | null;
          lead_id: string | null;
          status: string;
          sent_at: string | null;
        };
      };
      messages_inbound: {
        Row: {
          id: string;
          client_id: string;
          lead_id: string | null;
          text_content: string | null;
          received_at: string;
        };
      };
      responses: {
        Row: {
          id: string;
          client_id: string;
          lead_id: string | null;
          type: "unsubscribe" | "positive" | "other";
          created_at: string;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          client_id: string | null;
          event_type: string;
          received_at: string;
        };
      };
    };
    Views: {
      v_campaign_metrics: {
        Row: {
          campaign_id: string | null;
          client_id: string | null;
          sent_count: number | null;
          failed_count: number | null;
          inbound_count: number | null;
          unsubscribe_count: number | null;
        };
      };
      v_client_metrics: {
        Row: {
          client_id: string | null;
          day: string | null;
          outbound_sent: number | null;
          inbound_received: number | null;
          unsubscribes: number | null;
        };
      };
    };
  };
};
