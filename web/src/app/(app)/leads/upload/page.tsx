"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { useMutation } from "@tanstack/react-query";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useClients } from "@/hooks/useClients";

interface LeadRow {
  name?: string;
  whatsapp: string;
  tags?: string[];
  isValid?: boolean;
  isDuplicate?: boolean;
  normalizedPhone?: string;
}

export default function UploadLeadsPage() {
  const router = useRouter();
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<LeadRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (leads: LeadRow[]) => {
      const validLeads = leads.filter((l) => l.isValid && !l.isDuplicate);
      const res = await fetch("/api/upload-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          leads: validLeads.map((l) => ({
            full_name: l.name,
            whatsapp: l.normalizedPhone,
            tags: l.tags || [],
          })),
        }),
      });

      if (!res.ok) throw new Error("Falha no upload");

      return res.json();
    },
    onSuccess: () => {
      router.push("/leads");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFile(file);
    const text = await file.text();

    setCsvText(text);
    parseCSV(text);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0]
      ?.toLowerCase()
      .split(",")
      .map((h) => h.trim());

    if (!headers || lines.length < 2) {
      setParsedLeads([]);

      return;
    }

    const nameIndex = headers.findIndex(
      (h) => h.includes("nome") || h.includes("name"),
    );
    const phoneIndex = headers.findIndex(
      (h) =>
        h.includes("whatsapp") ||
        h.includes("telefone") ||
        h.includes("phone") ||
        h.includes("celular"),
    );
    const tagsIndex = headers.findIndex(
      (h) => h.includes("tag") || h.includes("grupo"),
    );

    if (phoneIndex === -1) {
      alert("CSV deve conter uma coluna de telefone/whatsapp");
      setParsedLeads([]);

      return;
    }

    const leads: LeadRow[] = [];
    const phonesSeen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const rawPhone = cols[phoneIndex];

      if (!rawPhone) continue;

      // Normalizar o número
      let normalizedPhone = rawPhone;
      let isValid = false;

      try {
        // Tentar parsear com libphonenumber
        const phoneNumber = parsePhoneNumberFromString(rawPhone, "BR");

        if (phoneNumber && phoneNumber.isValid()) {
          normalizedPhone = phoneNumber.format("E.164");
          isValid = true;
        } else {
          // Fallback para normalização simples
          const digits = rawPhone.replace(/\D/g, "");

          if (digits.length >= 10) {
            normalizedPhone = digits.startsWith("55")
              ? `+${digits}`
              : `+55${digits}`;
            isValid = true;
          }
        }
      } catch {
        // Fallback para normalização simples
        const digits = rawPhone.replace(/\D/g, "");

        if (digits.length >= 10) {
          normalizedPhone = digits.startsWith("55")
            ? `+${digits}`
            : `+55${digits}`;
          isValid = true;
        }
      }

      const isDuplicate = phonesSeen.has(normalizedPhone);

      if (!isDuplicate && isValid) {
        phonesSeen.add(normalizedPhone);
      }

      leads.push({
        name: nameIndex >= 0 ? cols[nameIndex] : undefined,
        whatsapp: rawPhone,
        tags:
          tagsIndex >= 0 && cols[tagsIndex] ? cols[tagsIndex].split(";") : [],
        isValid,
        isDuplicate,
        normalizedPhone,
      });
    }

    setParsedLeads(leads);
    setShowPreview(true);
  };

  const validCount = parsedLeads.filter(
    (l) => l.isValid && !l.isDuplicate,
  ).length;
  const invalidCount = parsedLeads.filter((l) => !l.isValid).length;
  const duplicateCount = parsedLeads.filter((l) => l.isDuplicate).length;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">Upload de Leads via CSV</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            isRequired
            label="Cliente"
            placeholder="Selecione o cliente"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            items={clients || []}
          >
            {(client) => (
              <SelectItem key={client.id}>
                {client.name}
              </SelectItem>
            )}
          </Select>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Formato do CSV: O arquivo deve conter colunas com nome,
              telefone/whatsapp e tags (opcional). A primeira linha deve ser o
              cabeçalho.
            </p>
            <Input
              accept=".csv"
              label="Arquivo CSV"
              type="file"
              onChange={handleFileChange}
            />
          </div>

          {showPreview && parsedLeads.length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ Válidos: {validCount}</span>
                <span className="text-red-600">
                  ✗ Inválidos: {invalidCount}
                </span>
                <span className="text-yellow-600">
                  ⚠ Duplicados: {duplicateCount}
                </span>
              </div>

              <div className="max-h-96 overflow-auto border rounded-lg">
                <Table aria-label="Preview dos leads">
                  <TableHeader>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Nome</TableColumn>
                    <TableColumn>WhatsApp Original</TableColumn>
                    <TableColumn>WhatsApp Normalizado</TableColumn>
                    <TableColumn>Tags</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 100).map((lead, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {lead.isDuplicate ? (
                            <span className="text-yellow-600">Duplicado</span>
                          ) : lead.isValid ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </TableCell>
                        <TableCell>{lead.name || "-"}</TableCell>
                        <TableCell>{lead.whatsapp}</TableCell>
                        <TableCell>{lead.normalizedPhone || "-"}</TableCell>
                        <TableCell>{lead.tags?.join(", ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {parsedLeads.length > 100 && (
                <p className="text-sm text-gray-600">
                  Mostrando apenas os primeiros 100 de {parsedLeads.length}{" "}
                  leads
                </p>
              )}

              <div className="flex gap-4">
                <Button
                  color="primary"
                  isDisabled={!clientId || validCount === 0}
                  isLoading={uploadMutation.isPending}
                  onPress={() => uploadMutation.mutate(parsedLeads)}
                >
                  Importar {validCount} Leads Válidos
                </Button>
                <Button
                  variant="bordered"
                  onPress={() => {
                    setShowPreview(false);
                    setParsedLeads([]);
                    setCsvText("");
                    setFile(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
