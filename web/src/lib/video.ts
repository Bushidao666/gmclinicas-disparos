"use client";

// Conversão de vídeo para MP4 usando ffmpeg.wasm
// Carregamos ffmpeg de forma lazy via dynamic import para evitar peso no SSR

let ffmpegInstancePromise: Promise<any> | null = null;

async function loadFFmpeg() {
  if (ffmpegInstancePromise) return ffmpegInstancePromise;

  ffmpegInstancePromise = (async () => {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);

    const ffmpeg = new FFmpeg();

    // Carregar core a partir de CDN e transformar em Blob URL para evitar CORS
    const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm");
    const workerURL = await toBlobURL(
      `${baseUrl}/ffmpeg-core.worker.js`,
      "text/javascript",
    );

    await ffmpeg.load({ coreURL, wasmURL, workerURL });

    return { ffmpeg, fetchFile };
  })();

  return ffmpegInstancePromise;
}

/**
 * Converte um arquivo de vídeo para MP4 (H.264 + AAC) quando possível.
 * Retorna o próprio arquivo se já estiver em MP4.
 */
export async function ensureMp4File(inputFile: File): Promise<File> {
  const isAlreadyMp4 = inputFile.type === "video/mp4" || /\.mp4$/i.test(inputFile.name);
  if (isAlreadyMp4) return inputFile;

  const { ffmpeg, fetchFile } = await loadFFmpeg();

  const inputExt = (() => {
    const parts = inputFile.name.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "dat";
  })();

  const inputName = `input.${inputExt}`;
  const outputName = `output.mp4`;

  await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

  // Tentar H.264 + AAC com faststart (melhor compatibilidade no WhatsApp)
  // Em algumas builds, libx264 pode não estar disponível; faremos fallback.
  let succeeded = true;
  try {
    await ffmpeg.exec([
      "-i",
      inputName,
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputName,
    ]);
  } catch (_e) {
    // Fallback para um encoder mais genérico caso libx264 não esteja embutido
    succeeded = false;
  }

  if (!succeeded) {
    await ffmpeg.exec([
      "-i",
      inputName,
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v",
      "mpeg4",
      "-qscale:v",
      "3",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputName,
    ]);
  }

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: "video/mp4" });
  const baseName = inputFile.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.mp4`, { type: "video/mp4" });
}


