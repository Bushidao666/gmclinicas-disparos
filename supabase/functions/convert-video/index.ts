// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: convert-video
// Recebe multipart/form-data (campo "file"), converte para MP4 via ffmpeg.wasm e salva em bucket "media".

import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { FFmpeg } from "npm:@ffmpeg/ffmpeg@0.12.10";
import { fetchFile, toBlobURL } from "npm:@ffmpeg/util@0.12.1";

type JsonResponse = {
  error?: string;
  path?: string;
};

function json(body: JsonResponse, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
      ...(init.headers || {}),
    },
  });
}

async function ensureFFmpeg() {
  const ffmpeg = new FFmpeg();
  const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm", "application/wasm");
  const workerURL = await toBlobURL(`${baseUrl}/ffmpeg-core.worker.js`, "text/javascript");
  await ffmpeg.load({ coreURL, wasmURL, workerURL });
  return ffmpeg;
}

function sanitizeName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > -1 ? name.slice(lastDot) : "";
  const base = (lastDot > -1 ? name.slice(0, lastDot) : name)
    .replace(/[^a-zA-Z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${base || "file"}${ext}`;
}

async function convertToMp4(inputFile: File): Promise<{ blob: Blob; outName: string }> {
  const ffmpeg = await ensureFFmpeg();
  const parts = inputFile.name.split(".");
  const inputExt = parts.length > 1 ? parts.pop()!.toLowerCase() : "dat";
  const inputName = `input.${inputExt}`;
  const outName = `output.mp4`;

  await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

  let ok = true;
  try {
    await ffmpeg.exec([
      "-i", inputName,
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      outName,
    ]);
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    await ffmpeg.exec([
      "-i", inputName,
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "mpeg4",
      "-qscale:v", "3",
      "-c:a", "aac",
      "-b:a", "128k",
      outName,
    ]);
  }

  const data = await ffmpeg.readFile(outName);
  const blob = new Blob([data], { type: "video/mp4" });
  return { blob, outName };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-allow-headers": "authorization,content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = req.headers.get("authorization") ?? undefined;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Content-Type deve ser multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Campo 'file' ausente" }, { status: 400 });
    }

    // Se já for MP4, apenas suba
    const isMp4 = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    const fileToStore: { blob: Blob; filename: string; contentType: string } = isMp4
      ? { blob: file, filename: sanitizeName(file.name), contentType: file.type || "video/mp4" }
      : (() => {
          // Será substituído após conversão
          return { blob: file, filename: sanitizeName(file.name), contentType: file.type || "application/octet-stream" };
        })();

    let finalBlob = fileToStore.blob;
    let finalName = fileToStore.filename;
    let finalType = fileToStore.contentType;

    if (!isMp4) {
      const { blob } = await convertToMp4(file);
      const base = file.name.replace(/\.[^/.]+$/, "");
      finalBlob = blob;
      finalName = `${base}.mp4`;
      finalType = "video/mp4";
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: auth ? { Authorization: auth } : {} },
    });

    const safeName = finalName.replace(/[^a-zA-Z0-9_.-]+/g, "_");
    const path = `campaign-media/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, finalBlob, {
        contentType: finalType,
        upsert: true,
        cacheControl: "3600",
      });
    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ path }, { status: 200 });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
});

