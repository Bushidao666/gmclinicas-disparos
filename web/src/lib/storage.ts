"use client";

import { createSupabaseClient } from "@/lib/supabaseClient";

export async function uploadToMediaBucket(
  file: File,
): Promise<{ path: string }> {
  const supabase = createSupabaseClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
  const path = `campaign-media/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });

  if (error) throw error;

  return { path };
}

export async function createSignedUrl(
  path: string,
  expiresInSeconds = 60 * 10,
) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;

  return data.signedUrl;
}
