"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";

import { uploadToMediaBucket } from "@/lib/storage";
import { useEvoInstances } from "@/hooks/useEvoInstances";
import { useClients } from "@/hooks/useClients";

const schema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  name: z.string().min(2),
  start_at: z.string().min(10, "Informe uma data ISO"),
  daily_volume: z.number().min(1),
  content_type: z.enum(["text", "image", "video", "audio", "document"]),
  caption_text: z.string().optional().nullable(),
  evoapi_instance_id: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function CampaignsPage() {
  const { data: clients = [] } = useClients();
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const { data: instances = [] } = useEvoInstances(clientId);
  const [result, setResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      daily_volume: 50,
      content_type: "text",
    },
  });

  const onSubmit = async (values: FormData) => {
    // Se houver arquivo selecionado e tipo for mídia, realizar upload e trocar media_path
    if (
      values.content_type !== "text" &&
      (values as any).media_file instanceof File
    ) {
      const file = (values as any).media_file as File;
      const { path } = await uploadToMediaBucket(file);

      (values as any).media_path = path; // salvar apenas path
    }

    const res = await fetch("/api/create-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    setResult(data);
  };

  return (
    <main className="p-6 grid gap-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Criar Campanha</h1>
        <Button as="a" color="primary" href="/campaigns/create" variant="flat">
          Usar Wizard
        </Button>
      </div>
      <form
        className="grid gap-4 bg-content1 p-4 rounded-large"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Select
          errorMessage={errors.client_id?.message}
          isInvalid={!!errors.client_id}
          label="Cliente"
          selectedKeys={watch("client_id") ? [watch("client_id")] : []}
          onChange={(e) => {
            const id = e.target.value;

            setValue("client_id", id);
            setClientId(id);
          }}
          items={clients}
        >
          {(client) => (
            <SelectItem key={client.id} textValue={client.name}>
              {client.name}
            </SelectItem>
          )}
        </Select>

        <Input
          label="Nome"
          {...register("name")}
          errorMessage={errors.name?.message}
          isInvalid={!!errors.name}
        />
        <Input
          label="Início (ISO)"
          placeholder="2025-08-12T13:00:00Z"
          {...register("start_at")}
          errorMessage={errors.start_at?.message}
          isInvalid={!!errors.start_at}
        />
        <Input
          label="Volume diário"
          type="number"
          {...register("daily_volume", { valueAsNumber: true })}
          errorMessage={errors.daily_volume?.message}
          isInvalid={!!errors.daily_volume}
        />
        <Select
          label="Tipo de conteúdo"
          selectedKeys={[watch("content_type") ?? "text"]}
          onChange={(e) =>
            setValue("content_type", e.target.value as FormData["content_type"])
          }
          items={["text", "image", "video", "audio", "document"].map(t => ({ value: t, label: t }))}
        >
          {(item) => (
            <SelectItem key={item.value}>
              {item.label}
            </SelectItem>
          )}
        </Select>
        <Input label="Legenda (opcional)" {...register("caption_text")} />

        {/* Upload de mídia quando não for texto */}
        {watch("content_type") !== "text" && (
          <Input
            accept={
              watch("content_type") === "image"
                ? "image/*"
                : watch("content_type") === "video"
                  ? "video/*"
                  : watch("content_type") === "audio"
                    ? "audio/*"
                    : "*/*"
            }
            label="Arquivo de mídia"
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];

              // RHF não tipa File nativamente no register; usamos setValue via any
              if (f) (setValue as any)("media_file", f);
            }}
          />
        )}

        <Select
          label="Instância Evolution (opcional)"
          selectedKeys={
            watch("evoapi_instance_id")
              ? [watch("evoapi_instance_id") as string]
              : []
          }
          onChange={(e) => setValue("evoapi_instance_id", e.target.value)}
          items={instances}
        >
          {(instance) => (
            <SelectItem
              key={instance.id}
              textValue={instance.name ?? instance.instance_id}
            >
              {instance.name ?? instance.instance_id}
            </SelectItem>
          )}
        </Select>

        <Button color="primary" isLoading={isSubmitting} type="submit">
          Criar Campanha
        </Button>
      </form>

      {result && (
        <pre className="bg-content1 p-4 rounded-large text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
