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
      console.error("Erro ao criar cliente:", error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1">
            Novo Cliente
          </ModalHeader>
          <ModalBody>
            <Input
              label="Nome do Cliente"
              placeholder="Ex: Clínica Odontológica"
              {...register("name")}
              errorMessage={errors.name?.message}
              isInvalid={!!errors.name}
              isRequired
            />
            <Input
              label="URL da Foto (opcional)"
              placeholder="https://exemplo.com/logo.png"
              {...register("photo_url")}
              errorMessage={errors.photo_url?.message}
              isInvalid={!!errors.photo_url}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={handleClose}>
              Cancelar
            </Button>
            <Button 
              color="primary" 
              type="submit"
              isLoading={createClient.isPending}
            >
              Criar Cliente
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}