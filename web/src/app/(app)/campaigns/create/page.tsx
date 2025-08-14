"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

import { useClients } from "@/hooks/useClients";
import { useClientInstances } from "@/hooks/useEvoInstances";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Step = "client" | "instance" | "content" | "schedule" | "review";

interface CampaignData {
  clientId: string;
  instanceId: string;
  name: string;
  contentType: "text" | "image" | "video" | "audio" | "document";
  captionText: string;
  mediaFile?: File;
  mediaPath?: string;
  startDate: string;
  startTime: string;
  dailyVolume: number;
  targetCount?: number;
}

const steps: { id: Step; label: string; description: string }[] = [
  { id: "client", label: "Cliente", description: "Selecione o cliente para a campanha" },
  { id: "instance", label: "Instância", description: "Escolha a instância do WhatsApp" },
  { id: "content", label: "Conteúdo", description: "Configure a mensagem" },
  { id: "schedule", label: "Agendamento", description: "Defina quando e como enviar" },
  { id: "review", label: "Revisão", description: "Confirme os detalhes" },
];

// Função para sanitizar nome de arquivo
function sanitizeFileName(originalName: string): string {
  // Extrair extensão
  const lastDot = originalName.lastIndexOf('.');
  const ext = lastDot > -1 ? originalName.slice(lastDot) : '';
  const nameWithoutExt = lastDot > -1 ? originalName.slice(0, lastDot) : originalName;
  
  // Sanitizar nome (mantém apenas letras, números, hífens e underscores)
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // Substitui caracteres inválidos por _
    .replace(/_+/g, '_')               // Remove underscores duplicados
    .replace(/^_|_$/g, '');            // Remove _ do início e fim
  
  // Se ficar vazio, usar nome padrão
  const finalName = sanitized || 'file';
  
  return finalName + ext;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { data: clients } = useClients();
  
  const [currentStep, setCurrentStep] = useState<Step>("client");
  const [campaignData, setCampaignData] = useState<CampaignData>({
    clientId: "",
    instanceId: "",
    name: "",
    contentType: "text",
    captionText: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    dailyVolume: 100,
    targetCount: undefined,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      // Upload mídia se houver
      let mediaPath = campaignData.mediaPath;
      
      if (campaignData.mediaFile && campaignData.contentType !== "text") {
        const fileName = `${Date.now()}-${sanitizeFileName(campaignData.mediaFile.name)}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, campaignData.mediaFile);
        
        if (uploadError) throw uploadError;
        mediaPath = uploadData.path;
      }

      // Criar campanha via API
      const startAt = new Date(`${campaignData.startDate}T${campaignData.startTime}`).toISOString();
      
      const res = await fetch("/api/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: campaignData.clientId,
          name: campaignData.name,
          start_at: startAt,
          daily_volume: campaignData.dailyVolume,
          target_count: campaignData.targetCount || null,
          content_type: campaignData.contentType,
          caption_text: campaignData.captionText,
          media_path: mediaPath,
          evoapi_instance_id: campaignData.instanceId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar campanha");
      }

      return res.json();
    },
    onSuccess: () => {
      router.push("/campaigns");
    },
  });

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "client":
        return !!campaignData.clientId;
      case "instance":
        return !!campaignData.instanceId;
      case "content":
        return !!campaignData.name && !!campaignData.captionText;
      case "schedule":
        return campaignData.dailyVolume > 0 && !!campaignData.startDate && !!campaignData.startTime;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const prevStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  // Buscar instâncias do cliente selecionado
  const { data: clientInstances, isLoading: isLoadingInstances } = useClientInstances(campaignData.clientId);
  
  const selectedClient = clients?.find(c => c.id === campaignData.clientId);
  const selectedInstance = clientInstances?.find(i => i.id === campaignData.instanceId);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Criar Nova Campanha</h1>
        <p className="text-gray-600">Configure sua campanha de disparos passo a passo</p>
      </div>

      <Progress 
        value={progress} 
        className="mb-6"
        color="primary"
        size="sm"
      />

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {steps.map((step, idx) => (
          <Chip
            key={step.id}
            variant={currentStep === step.id ? "solid" : "flat"}
            color={currentStep === step.id ? "primary" : "default"}
            className="cursor-pointer"
            onClick={() => {
              if (idx <= currentStepIndex) {
                setCurrentStep(step.id);
              }
            }}
          >
            {idx + 1}. {step.label}
          </Chip>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-lg font-semibold">
              {steps.find(s => s.id === currentStep)?.label}
            </h2>
            <p className="text-sm text-gray-600">
              {steps.find(s => s.id === currentStep)?.description}
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {currentStep === "client" && (
            <Select
              label="Selecione o Cliente"
              placeholder="Escolha um cliente"
              value={campaignData.clientId}
              onChange={(e) => setCampaignData({ ...campaignData, clientId: e.target.value, instanceId: "" })}
              isRequired
            >
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </Select>
          )}

          {currentStep === "instance" && (
            <>
              {isLoadingInstances ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-600">Carregando instâncias...</p>
                </div>
              ) : !clientInstances || clientInstances.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">
                    ⚠️ Nenhuma instância vinculada ao cliente <strong>{selectedClient?.name}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Você precisa vincular uma instância a este cliente antes de criar uma campanha.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="flat"
                      color="default"
                      onClick={prevStep}
                    >
                      Voltar
                    </Button>
                    <Button
                      as="a"
                      href="/instances"
                      target="_blank"
                      variant="solid"
                      color="primary"
                    >
                      Vincular Instância
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      Cliente selecionado: <strong>{selectedClient?.name}</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {clientInstances.length} instância{clientInstances.length > 1 ? 's' : ''} disponível{clientInstances.length > 1 ? 'is' : ''}
                    </p>
                  </div>
                  
                  <Select
                    label="Selecione a Instância"
                    placeholder="Escolha uma instância"
                    value={campaignData.instanceId}
                    onChange={(e) => setCampaignData({ ...campaignData, instanceId: e.target.value })}
                    isRequired
                  >
                    {clientInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name || instance.instance_id} - {instance.status === "connected" ? "✅ Conectada" : "⚠️ Desconectada"}
                      </SelectItem>
                    ))}
                  </Select>

                  {selectedInstance && (
                    <div className="bg-gray-50 border rounded-lg p-3">
                      <p className="text-sm font-medium">Instância selecionada:</p>
                      <p className="text-sm text-gray-600">{selectedInstance.name || selectedInstance.instance_id}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {selectedInstance.status === "connected" ? 
                          <span className="text-green-600">✅ Conectada</span> : 
                          <span className="text-yellow-600">⚠️ Desconectada</span>
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {currentStep === "content" && (
            <>
              <Input
                label="Nome da Campanha"
                placeholder="Ex: Promoção de Natal 2024"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                isRequired
              />

              <Select
                label="Tipo de Conteúdo"
                value={campaignData.contentType}
                onChange={(e) => setCampaignData({ ...campaignData, contentType: e.target.value as any })}
              >
                <SelectItem key="text" value="text">Apenas Texto</SelectItem>
                <SelectItem key="image" value="image">Imagem</SelectItem>
                <SelectItem key="video" value="video">Vídeo</SelectItem>
                <SelectItem key="audio" value="audio">Áudio</SelectItem>
                <SelectItem key="document" value="document">Documento</SelectItem>
              </Select>

              {campaignData.contentType !== "text" && (
                <div className="space-y-2">
                  <Input
                    type="file"
                    label="Arquivo de Mídia"
                    accept={
                      campaignData.contentType === "image" ? "image/*" :
                      campaignData.contentType === "video" ? "video/*" :
                      campaignData.contentType === "audio" ? "audio/*" :
                      "*"
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCampaignData({ ...campaignData, mediaFile: file });
                      }
                    }}
                  />
                  {campaignData.mediaFile && (
                    <p className="text-sm text-gray-600">
                      Arquivo selecionado: {campaignData.mediaFile.name}
                    </p>
                  )}
                </div>
              )}

              <Textarea
                label={campaignData.contentType === "text" ? "Mensagem" : "Legenda"}
                placeholder="Digite a mensagem que será enviada..."
                value={campaignData.captionText}
                onChange={(e) => setCampaignData({ ...campaignData, captionText: e.target.value })}
                minRows={5}
                isRequired
              />

              {campaignData.captionText && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Preview da Mensagem:</p>
                  <div className="bg-white rounded-lg p-3 border">
                    {campaignData.mediaFile && (
                      <div className="mb-2 text-gray-500 text-sm">
                        📎 {campaignData.mediaFile.name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{campaignData.captionText}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === "schedule" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Data de Início"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData({ ...campaignData, startDate: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  isRequired
                />
                <Input
                  type="time"
                  label="Hora de Início"
                  value={campaignData.startTime}
                  onChange={(e) => setCampaignData({ ...campaignData, startTime: e.target.value })}
                  isRequired
                />
              </div>

              <Input
                type="number"
                label="Volume Diário"
                placeholder="Quantidade de mensagens por dia"
                value={campaignData.dailyVolume.toString()}
                onChange={(e) => setCampaignData({ ...campaignData, dailyVolume: parseInt(e.target.value) || 0 })}
                min="1"
                isRequired
              />

              <Input
                type="number"
                label="Total de Leads (opcional)"
                placeholder="Deixe vazio para enviar para todos"
                value={campaignData.targetCount?.toString() || ""}
                onChange={(e) => setCampaignData({ ...campaignData, targetCount: e.target.value ? parseInt(e.target.value) : undefined })}
                min="1"
              />

              <div className="border rounded-lg p-4 bg-blue-50">
                <p className="text-sm font-medium mb-2">Estimativa:</p>
                <p className="text-sm">
                  {campaignData.targetCount ? (
                    <>
                      Enviando {campaignData.dailyVolume} mensagens/dia para {campaignData.targetCount} leads.
                      <br />
                      Duração estimada: {Math.ceil((campaignData.targetCount || 0) / campaignData.dailyVolume)} dias
                    </>
                  ) : (
                    `Enviando ${campaignData.dailyVolume} mensagens por dia para todos os leads disponíveis.`
                  )}
                </p>
              </div>
            </>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Resumo da Campanha</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{selectedClient?.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instância:</span>
                    <span className="font-medium">{selectedInstance?.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nome da Campanha:</span>
                    <span className="font-medium">{campaignData.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Conteúdo:</span>
                    <span className="font-medium">{campaignData.contentType}</span>
                  </div>
                  
                  {campaignData.mediaFile && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Arquivo:</span>
                      <span className="font-medium">{campaignData.mediaFile.name}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Início:</span>
                    <span className="font-medium">
                      {format(new Date(`${campaignData.startDate}T${campaignData.startTime}`), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume Diário:</span>
                    <span className="font-medium">{campaignData.dailyVolume} mensagens</span>
                  </div>
                  
                  {campaignData.targetCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de Leads:</span>
                      <span className="font-medium">{campaignData.targetCount}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Mensagem:</h4>
                <p className="whitespace-pre-wrap text-sm">{campaignData.captionText}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Após criar a campanha, os disparos começarão automaticamente na data e hora configuradas.
                  Certifique-se de que todos os dados estão corretos.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="flat"
              onPress={prevStep}
              isDisabled={currentStepIndex === 0}
            >
              Voltar
            </Button>
            
            {currentStep === "review" ? (
              <Button
                color="primary"
                onPress={() => createCampaignMutation.mutate()}
                isLoading={createCampaignMutation.isPending}
                isDisabled={!canProceed()}
              >
                Criar Campanha
              </Button>
            ) : (
              <Button
                color="primary"
                onPress={nextStep}
                isDisabled={!canProceed()}
              >
                Próximo
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </main>
  );
}