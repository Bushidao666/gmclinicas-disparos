"use client";

import { createSupabaseClient } from "@/lib/supabaseClient";
import * as tus from "tus-js-client";

export async function uploadToMediaBucket(
  file: File,
): Promise<{ path: string }> {
  const supabase = createSupabaseClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
  const path = `campaign-media/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: true,
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

export async function uploadResumableToMediaBucket(
  file: File,
): Promise<{ path: string }> {
  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Usuário não autenticado");

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectId = new URL(projectUrl).hostname.split(".")[0];
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
  const path = `campaign-media/${Date.now()}-${safeName}`;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // 6MB, obrigatório para TUS no Supabase
      metadata: {
        bucketName: "media",
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError(error) {
        reject(error);
      },
      onSuccess() {
        resolve({ path });
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

export async function uploadMediaSmart(
  file: File,
): Promise<{ path: string }> {
  const isVideoOrAudio = /^(video|audio)\//.test(file.type || "");
  const isLarge = file.size > 1 * 1024 * 1024; // > 1MB
  // Para vídeos/áudios ou arquivos grandes, usar TUS; caso contrário, upload padrão
  if (isVideoOrAudio || isLarge) {
    return uploadResumableToMediaBucket(file);
  }
  return uploadToMediaBucket(file);
}
