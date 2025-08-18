"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useCreateClient } from "@/hooks/useCreateClient";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  photo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  const createClient = useCreateClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createClient.mutateAsync({
        name: data.name,
        photo_url: data.photo_url || undefined,
      });
      reset();
      onClose();
    } catch (error) {
      // Erro ao criar cliente
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "animate-slideInUp",
        body: "py-6",
      }}
    >
      <ModalContent className="glass-primary border border-white/20">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gm-black dark:text-white">
                  Novo Cliente
                </h2>
                <p className="text-sm text-arsenic-500 dark:text-arsenic-400">
                  Adicione um novo cliente ao sistema
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Nome do Cliente"
              placeholder="Ex: Clínica Odontológica"
              {...register("name")}
              isRequired
              errorMessage={errors.name?.message}
              isInvalid={!!errors.name}
              variant="bordered"
              classNames={{
                inputWrapper: "bg-white/5 backdrop-blur-md border-white/20 hover:border-primary/50 data-[hover=true]:border-primary/50",
                label: "text-arsenic-500 dark:text-arsenic-400",
                input: "text-gm-black dark:text-white",
              }}
              startContent={
                <svg className="w-5 h-5 text-arsenic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <Input
              label="URL da Foto (opcional)"
              placeholder="https://exemplo.com/logo.png"
              {...register("photo_url")}
              errorMessage={errors.photo_url?.message}
              isInvalid={!!errors.photo_url}
              variant="bordered"
              classNames={{
                inputWrapper: "bg-white/5 backdrop-blur-md border-white/20 hover:border-primary/50 data-[hover=true]:border-primary/50",
                label: "text-arsenic-500 dark:text-arsenic-400",
                input: "text-gm-black dark:text-white",
              }}
              startContent={
                <svg className="w-5 h-5 text-arsenic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </ModalBody>
          <ModalFooter className="border-t border-white/10 pt-4">
            <Button 
              variant="light" 
              onPress={handleClose}
              className="text-danger hover:bg-danger/10 transition-all duration-300"
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              isLoading={createClient.isPending}
              type="submit"
            >
              {createClient.isPending ? "Criando..." : "Criar Cliente"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
