import type { Database } from "./types";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10, // Limitar eventos por segundo
        },
      },
      global: {
        headers: {
          "X-Client-Info": "mgclinic-web",
        },
      },
    },
  );
}

export const createSupabaseBrowser = createSupabaseClient;
