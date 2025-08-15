"use client";

import { Card, CardBody } from "@heroui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCheck,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Music,
  Film,
  Camera,
  Mic,
  Smile,
  Plus,
  Wifi,
  Battery,
  Signal,
  ChevronLeft,
} from "lucide-react";

interface WhatsAppPreviewProps {
  contentType: "text" | "image" | "video" | "audio" | "document";
  captionText: string;
  mediaFile?: File;
  clientName?: string;
  campaignName?: string;
  instanceName?: string;
  dailyVolume?: number;
  targetCount?: number;
  startDate?: string;
  startTime?: string;
}

function getMediaIcon(contentType: string) {
  switch (contentType) {
    case "image":
      return <ImageIcon className="w-8 h-8 text-gray-400" />;
    case "video":
      return <Film className="w-8 h-8 text-gray-400" />;
    case "audio":
      return <Music className="w-8 h-8 text-gray-400" />;
    case "document":
      return <FileText className="w-8 h-8 text-gray-400" />;
    default:
      return <Paperclip className="w-8 h-8 text-gray-400" />;
  }
}

export function WhatsAppPreview({
  contentType,
  captionText,
  mediaFile,
  clientName,
  campaignName,
  instanceName,
  dailyVolume,
  targetCount,
  startDate,
  startTime,
}: WhatsAppPreviewProps) {
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar hora atual a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Preview de mídia
  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview(null);
      return;
    }

    if (contentType === "image" || contentType === "video") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(mediaFile);
    }
  }, [mediaFile, contentType]);

  const formattedTime = format(currentTime, "HH:mm", { locale: ptBR });
  
  // Formatar data de início se disponível
  const formattedStartDate = startDate && startTime
    ? format(new Date(`${startDate}T${startTime}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Preview do WhatsApp - Celular Realista */}
      <div className="relative mx-auto">
        {/* Frame do celular */}
        <div className="relative bg-black rounded-[2.5rem] p-[2px] shadow-xl" style={{ width: "280px" }}>
          {/* Borda metálica */}
          <div className="relative bg-gray-900 rounded-[2.3rem] p-[2px]">
            {/* Tela */}
            <div className="relative bg-black rounded-[2.2rem] overflow-hidden" style={{ height: "500px" }}>
              {/* Notch/Dynamic Island */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-xl z-50">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-gray-800 rounded-full" />
              </div>

              {/* Status bar do iOS/Android */}
              <div className="relative bg-white px-5 pt-1.5 pb-0.5 flex justify-between items-center text-[10px] font-medium">
                <div className="flex items-center gap-1">
                  <span>{formattedTime}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Signal className="w-2.5 h-2.5" />
                  <Wifi className="w-2.5 h-2.5" />
                  <Battery className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* WhatsApp Interface */}
              <div className="bg-white h-full flex flex-col">
                {/* WhatsApp Header */}
                <div className="bg-[#008069] px-3 py-2 flex items-center gap-2 shadow-sm">
                  <ChevronLeft className="w-4 h-4 text-white" />
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-white font-medium text-xs">Cliente Exemplo</p>
                    <p className="text-green-100 text-[10px]">online</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Video className="w-4 h-4 text-white" />
                    <Phone className="w-4 h-4 text-white" />
                    <MoreVertical className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Chat Area */}
                <div 
                  className="flex-1 overflow-y-auto px-2 py-1.5"
                  style={{
                    backgroundColor: '#e5ddd5',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c2bb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {/* Data */}
                  <div className="flex justify-center mb-3">
                    <div className="bg-white/90 px-2.5 py-0.5 rounded-full text-[10px] text-gray-600 shadow-sm">
                      Hoje
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div className="flex justify-end mb-2">
                    <motion.div 
                      className="bg-[#d9fdd3] rounded-lg shadow-sm relative max-w-[75%]"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{
                        borderTopRightRadius: "4px",
                        borderTopLeftRadius: "8px",
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                      }}
                    >
                      {/* Cauda da mensagem */}
                      <div 
                        className="absolute -right-[6px] top-0 w-3 h-3 bg-[#d9fdd3]"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 0 100%)",
                        }}
                      />
                      
                      <div className="px-2 pt-1.5 pb-1">
                        {/* Preview de mídia */}
                        {mediaFile && contentType !== "text" && (
                          <div className="mb-1.5 -mx-2 -mt-1.5">
                            {(contentType === "image" && mediaPreview) ? (
                              <img 
                                src={mediaPreview} 
                                alt="Preview" 
                                className="w-full h-auto max-h-40 object-cover rounded-t-lg"
                              />
                            ) : (contentType === "video" && mediaPreview) ? (
                              <div className="relative">
                                <video 
                                  src={mediaPreview} 
                                  className="w-full h-auto max-h-40 rounded-t-lg"
                                >
                                  <track kind="captions" />
                                </video>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-t-lg">
                                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                    <div className="w-0 h-0 border-l-[14px] border-l-gray-800 border-y-[8px] border-y-transparent ml-1" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white/50 p-3 flex items-center gap-2 rounded-t-lg">
                                {getMediaIcon(contentType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">
                                    {mediaFile.name}
                                  </p>
                                  <p className="text-[10px] text-gray-600">
                                    {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Texto da mensagem */}
                        <div className={mediaFile && contentType !== "text" ? "px-2" : ""}>
                          <AnimatePresence mode="wait">
                            {captionText ? (
                              <motion.p 
                                key="text"
                                className="text-xs text-gray-900 leading-[1.4] whitespace-pre-wrap"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                {captionText}
                              </motion.p>
                            ) : (
                              <motion.p 
                                key="placeholder"
                                className="text-xs text-gray-500 italic"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                Digite sua mensagem...
                              </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Hora e status */}
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <span className="text-[10px] text-gray-600">{formattedTime}</span>
                            <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-[#f0f2f5] px-2 py-1.5 flex items-center gap-1.5 border-t border-gray-200">
                  <Plus className="w-4 h-4 text-gray-600" />
                  <div className="flex-1 bg-white rounded-full px-2.5 py-1 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400 text-xs flex-1">Mensagem</span>
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <Camera className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="w-8 h-8 bg-[#008069] rounded-full flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões laterais do celular */}
          <div className="absolute -left-[2px] top-24 w-0.5 h-10 bg-gray-800 rounded-r-lg" />
          <div className="absolute -left-[2px] top-36 w-0.5 h-6 bg-gray-800 rounded-r-lg" />
          <div className="absolute -left-[2px] top-44 w-0.5 h-6 bg-gray-800 rounded-r-lg" />
          <div className="absolute -right-[2px] top-32 w-0.5 h-12 bg-gray-800 rounded-l-lg" />
        </div>
      </div>

      {/* Card de Resumo */}
      <AnimatePresence>
        {(clientName || campaignName || instanceName || dailyVolume) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-sm">
              <CardBody className="p-4">
                <h4 className="font-semibold text-sm mb-3 text-gray-700">Resumo da Campanha</h4>
                <div className="space-y-2 text-xs">
                  {clientName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Cliente:</span>
                      <span className="font-medium text-gray-800">{clientName}</span>
                    </div>
                  )}
                  {campaignName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Campanha:</span>
                      <span className="font-medium text-gray-800 truncate ml-2">{campaignName}</span>
                    </div>
                  )}
                  {instanceName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Instância:</span>
                      <span className="font-medium text-gray-800 truncate ml-2">{instanceName}</span>
                    </div>
                  )}
                  {formattedStartDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Início:</span>
                      <span className="font-medium text-gray-800">{formattedStartDate}</span>
                    </div>
                  )}
                  {dailyVolume && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Volume diário:</span>
                      <span className="font-medium text-gray-800">{dailyVolume} mensagens</span>
                    </div>
                  )}
                  {targetCount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Total de leads:</span>
                      <span className="font-medium text-gray-800">{targetCount}</span>
                    </div>
                  )}
                  {dailyVolume && targetCount && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-gray-500">Duração estimada:</span>
                      <span className="font-medium text-gray-800">
                        {Math.ceil(targetCount / dailyVolume)} dias
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}