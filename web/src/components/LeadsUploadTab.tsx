"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Chip } from "@heroui/chip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface LeadRow {
  name?: string;
  whatsapp: string;
  tags?: string[];
  isValid?: boolean;
  isDuplicate?: boolean;
  normalizedPhone?: string;
  existsInDb?: boolean;
}

interface LeadsUploadTabProps {
  clientId: string;
  clientName: string;
}

export function LeadsUploadTab({ clientId, clientName }: LeadsUploadTabProps) {
  const queryClient = useQueryClient();
  const [uploadMethod, setUploadMethod] = useState<"csv" | "json">("csv");
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState('[{"full_name":"Nome do Lead","whatsapp":"+55 11 90000-0000","tags":["tag1","tag2"]}]');
  const [parsedLeads, setParsedLeads] = useState<LeadRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Mutation para verificar duplicatas
  const checkDuplicatesMutation = useMutation({
    mutationFn: async (phones: string[]) => {
      // Simular verificação de duplicatas
      // TODO: Implementar chamada real ao backend
      const existingPhones = new Set<string>();
      return existingPhones;
    },
  });

  // Mutation para upload
  const uploadMutation = useMutation({
    mutationFn: async (leads: LeadRow[]) => {
      const validLeads = leads.filter((l) => l.isValid && !l.isDuplicate && !l.existsInDb);
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
    onSuccess: (data) => {
      toast.success(`${data.upserted ?? 0} leads importados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["leads", clientId] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats", clientId] });
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao importar leads");
      console.error("Erro:", error);
    },
  });

  const resetForm = () => {
    setShowPreview(false);
    setParsedLeads([]);
    setCsvText("");
    setJsonText('[{"full_name":"Nome do Lead","whatsapp":"+55 11 90000-0000","tags":["tag1","tag2"]}]');
    setFile(null);
  };

  const normalizePhone = (rawPhone: string): { normalized: string; isValid: boolean } => {
    try {
      const phoneNumber = parsePhoneNumberFromString(rawPhone, "BR");
      if (phoneNumber && phoneNumber.isValid()) {
        return { normalized: phoneNumber.format("E.164"), isValid: true };
      }
    } catch {}

    // Fallback
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length >= 10) {
      const normalized = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
      return { normalized, isValid: true };
    }

    return { normalized: rawPhone, isValid: false };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    const text = await file.text();

    if (file.name.endsWith(".json")) {
      setUploadMethod("json");
      setJsonText(text);
      parseJSON(text);
    } else {
      setUploadMethod("csv");
      setCsvText(text);
      parseCSV(text);
    }
  };

  const parseCSV = useCallback((text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0]?.toLowerCase().split(",").map((h) => h.trim());

    if (!headers || lines.length < 2) {
      toast.error("CSV inválido ou vazio");
      return;
    }

    const nameIndex = headers.findIndex((h) => h.includes("nome") || h.includes("name"));
    const phoneIndex = headers.findIndex((h) => 
      h.includes("whatsapp") || h.includes("telefone") || h.includes("phone") || h.includes("celular")
    );
    const tagsIndex = headers.findIndex((h) => h.includes("tag") || h.includes("grupo"));

    if (phoneIndex === -1) {
      toast.error("CSV deve conter uma coluna de telefone/whatsapp");
      return;
    }

    const leads: LeadRow[] = [];
    const phonesSeen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const rawPhone = cols[phoneIndex];
      if (!rawPhone) continue;

      const { normalized, isValid } = normalizePhone(rawPhone);
      const isDuplicate = phonesSeen.has(normalized);

      if (!isDuplicate && isValid) {
        phonesSeen.add(normalized);
      }

      leads.push({
        name: nameIndex >= 0 ? cols[nameIndex] : undefined,
        whatsapp: rawPhone,
        tags: tagsIndex >= 0 && cols[tagsIndex] ? cols[tagsIndex].split(";").map(t => t.trim()) : [],
        isValid,
        isDuplicate,
        normalizedPhone: normalized,
      });
    }

    setParsedLeads(leads);
    setShowPreview(true);
  }, []);

  const parseJSON = useCallback((text: string) => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        toast.error("JSON deve ser um array de objetos");
        return;
      }

      const leads: LeadRow[] = [];
      const phonesSeen = new Set<string>();

      data.forEach((item) => {
        const rawPhone = item.whatsapp || item.phone || item.telefone || "";
        if (!rawPhone) return;

        const { normalized, isValid } = normalizePhone(rawPhone);
        const isDuplicate = phonesSeen.has(normalized);

        if (!isDuplicate && isValid) {
          phonesSeen.add(normalized);
        }

        leads.push({
          name: item.full_name || item.name || item.nome,
          whatsapp: rawPhone,
          tags: Array.isArray(item.tags) ? item.tags : [],
          isValid,
          isDuplicate,
          normalizedPhone: normalized,
        });
      });

      setParsedLeads(leads);
      setShowPreview(true);
    } catch (error) {
      toast.error("JSON inválido");
      console.error("Erro ao parsear JSON:", error);
    }
  }, []);

  const validCount = parsedLeads.filter((l) => l.isValid && !l.isDuplicate && !l.existsInDb).length;
  const invalidCount = parsedLeads.filter((l) => !l.isValid).length;
  const duplicateCount = parsedLeads.filter((l) => l.isDuplicate).length;
  const existingCount = parsedLeads.filter((l) => l.existsInDb).length;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Importar Leads</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Seletor de método */}
          <div className="flex gap-2">
            <Button
              size="sm"
              color={uploadMethod === "csv" ? "primary" : "default"}
              variant={uploadMethod === "csv" ? "solid" : "flat"}
              onPress={() => setUploadMethod("csv")}
            >
              CSV
            </Button>
            <Button
              size="sm"
              color={uploadMethod === "json" ? "primary" : "default"}
              variant={uploadMethod === "json" ? "solid" : "flat"}
              onPress={() => setUploadMethod("json")}
            >
              JSON
            </Button>
          </div>

          {/* Input de arquivo */}
          <div className="space-y-2">
            <Input
              type="file"
              accept={uploadMethod === "csv" ? ".csv" : ".json"}
              onChange={handleFileChange}
              label="Selecione o arquivo"
              description={
                uploadMethod === "csv"
                  ? "Formato: nome,whatsapp,tags (tags separadas por ;)"
                  : "Array JSON com campos: full_name, whatsapp, tags[]"
              }
            />
          </div>

          {/* Área de texto para entrada manual */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Ou cole o conteúdo diretamente:</p>
            {uploadMethod === "csv" ? (
              <Textarea
                label="Conteúdo CSV"
                placeholder="nome,whatsapp,tags
João Silva,+55 11 98765-4321,cliente;vip
Maria Santos,11987654321,prospect"
                minRows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            ) : (
              <Textarea
                label="Conteúdo JSON"
                placeholder='[{"full_name":"João Silva","whatsapp":"+55 11 98765-4321","tags":["cliente","vip"]}]'
                minRows={5}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            )}
            <Button
              color="primary"
              variant="flat"
              onPress={() => {
                if (uploadMethod === "csv") {
                  parseCSV(csvText);
                } else {
                  parseJSON(jsonText);
                }
              }}
            >
              Processar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Preview */}
      {showPreview && parsedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-semibold">Preview da Importação</h3>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Válidos: {validCount}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-danger" />
                  Inválidos: {invalidCount}
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Duplicados: {duplicateCount}
                </span>
                {existingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    Já existentes: {existingCount}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="max-h-96 overflow-auto">
              <Table aria-label="Preview dos leads">
                <TableHeader>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>NOME</TableColumn>
                  <TableColumn>WHATSAPP ORIGINAL</TableColumn>
                  <TableColumn>WHATSAPP NORMALIZADO</TableColumn>
                  <TableColumn>TAGS</TableColumn>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 100).map((lead, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {lead.existsInDb ? (
                          <Chip size="sm" color="primary" variant="flat">
                            Já existe
                          </Chip>
                        ) : lead.isDuplicate ? (
                          <Chip size="sm" color="warning" variant="flat">
                            Duplicado
                          </Chip>
                        ) : lead.isValid ? (
                          <Chip size="sm" color="success" variant="flat">
                            Válido
                          </Chip>
                        ) : (
                          <Chip size="sm" color="danger" variant="flat">
                            Inválido
                          </Chip>
                        )}
                      </TableCell>
                      <TableCell>{lead.name || "-"}</TableCell>
                      <TableCell>{lead.whatsapp}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {lead.normalizedPhone || "-"}
                      </TableCell>
                      <TableCell>
                        {lead.tags && lead.tags.length > 0 ? lead.tags.join(", ") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedLeads.length > 100 && (
              <p className="text-sm text-gray-600 text-center">
                Mostrando apenas os primeiros 100 de {parsedLeads.length} leads
              </p>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                color="primary"
                isDisabled={validCount === 0}
                isLoading={uploadMutation.isPending}
                startContent={<Upload className="w-4 h-4" />}
                onPress={() => uploadMutation.mutate(parsedLeads)}
              >
                Importar {validCount} Leads Válidos
              </Button>
              <Button
                variant="bordered"
                onPress={resetForm}
              >
                Cancelar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}