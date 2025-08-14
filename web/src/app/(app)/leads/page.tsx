"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import Link from "next/link";

import { useClients } from "@/hooks/useClients";

const schema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  leads_json: z.string().min(2, "Informe os leads em JSON"),
});

type FormData = z.infer<typeof schema>;

export default function LeadsPage() {
  const { data: clients = [] } = useClients();
  const [result, setResult] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      leads_json: '[{"full_name":"Teste","whatsapp":"+55 11 90000-0000"}]',
    },
  });

  const onSubmit = async (values: FormData) => {
    const res = await fetch("/api/upload-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: values.client_id,
        leads: JSON.parse(values.leads_json),
      }),
    });
    const data = await res.json();

    setResult(data);
  };

  return (
    <main className="p-6 grid gap-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Gerenciar Leads</h1>
        <Button as={Link} color="primary" href="/leads/upload" variant="flat">
          Upload CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Importar Leads via JSON</h2>
        </CardHeader>
        <CardBody>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Select
              errorMessage={errors.client_id?.message}
              isInvalid={!!errors.client_id}
              label="Cliente"
              selectedKeys={watch("client_id") ? [watch("client_id")] : []}
              onChange={(e) => setValue("client_id", e.target.value)}
            >
              {clients.map((c) => (
                <SelectItem key={c.id} textValue={c.name} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </Select>

            <Textarea
              label="Leads (JSON)"
              minRows={10}
              {...register("leads_json")}
              errorMessage={errors.leads_json?.message}
              isInvalid={!!errors.leads_json}
            />

            <Button color="primary" isLoading={isSubmitting} type="submit">
              Enviar
            </Button>
          </form>

          {result && (
            <pre className="bg-content2 p-4 rounded-lg text-sm overflow-auto mt-4">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
