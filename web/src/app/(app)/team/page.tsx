"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Switch } from "@heroui/switch";

import { useUserRole } from "@/hooks/useUserRole";
import { FullPageLoader } from "@/components/FullPageLoader";
import { toast } from "sonner";

type Role = "admin" | "collaborator";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  permissions?: {
    manage_clients?: boolean;
    manage_campaigns?: boolean;
    view_all_metrics?: boolean;
  } | null;
}

interface PendingInvite {
  id: string;
  email: string;
  invited_at: string;
  role: Role | null;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { isAdmin, loading: roleLoading, profile } = useUserRole();
  const currentUserId = profile?.id;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("collaborator");
  const [permissions, setPermissions] = useState({
    manage_clients: true,
    manage_campaigns: true,
    view_all_metrics: true,
  });

  const { data: team, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<TeamMember[]> => {
      const res = await fetch("/api/team/list", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar equipe");
      return res.json();
    },
  });

  const { data: pending = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ["team-pending"],
    queryFn: async (): Promise<PendingInvite[]> => {
      const res = await fetch("/api/team/pending", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar convites pendentes");
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, permissions }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Falha ao enviar convite");
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["team-pending"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { userId: string; role?: Role; permissions?: TeamMember["permissions"] }) => {
      // Proteção no frontend: impedir alteração do próprio usuário
      if (payload.userId === currentUserId && payload.role) {
        throw new Error("Você não pode alterar seu próprio role");
      }
      
      const res = await fetch("/api/team/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Falha ao atualizar membro");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Membro atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar membro");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Falha ao remover membro");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["team-pending"] });
      toast.success("Membro removido com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  useEffect(() => {
    if (role === "admin") {
      // Admin tem acesso completo; ignora toggles
      setPermissions({ manage_clients: true, manage_campaigns: true, view_all_metrics: true });
    }
  }, [role]);

  if (roleLoading) return <FullPageLoader message="Verificando permissões..." />;
  if (!isAdmin) return <main className="p-6">Acesso restrito aos administradores.</main>;

  const canInvite = email.length > 3 && /@/.test(email);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipe</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Convidar Usuário</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select label="Função" selectedKeys={[role]} onChange={(e) => setRole(e.target.value as Role)}>
              <SelectItem key="collaborator">Colaborador</SelectItem>
              <SelectItem key="admin">Administrador</SelectItem>
            </Select>
            <div className="flex items-end">
              <Button
                color="primary"
                isDisabled={!canInvite}
                isLoading={inviteMutation.isPending}
                onPress={() => inviteMutation.mutate()}
              >
                Enviar Convite
              </Button>
            </div>
          </div>

          {role === "collaborator" && (
            <div className="flex gap-6 items-center">
              <Switch
                isSelected={!!permissions.manage_clients}
                onValueChange={(v) => setPermissions((p) => ({ ...p, manage_clients: v }))}
              >
                Gerenciar Clientes
              </Switch>
              <Switch
                isSelected={!!permissions.manage_campaigns}
                onValueChange={(v) => setPermissions((p) => ({ ...p, manage_campaigns: v }))}
              >
                Gerenciar Campanhas
              </Switch>
              <Switch
                isSelected={!!permissions.view_all_metrics}
                onValueChange={(v) => setPermissions((p) => ({ ...p, view_all_metrics: v }))}
              >
                Ver Todas Métricas
              </Switch>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Membros</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="py-8 text-center text-default-500">Carregando equipe...</div>
          ) : (team || []).length === 0 ? (
            <div className="py-8 text-center text-default-500">Sem membros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-default-500 border-b">
                    <th className="py-2">Nome</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Função</th>
                    <th className="py-2">Permissões</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {team!.map((member) => (
                    <tr key={member.id} className="border-b last:border-b-0">
                      <td className="py-2">{member.full_name || "—"}</td>
                      <td className="py-2">{member.email}</td>
                      <td className="py-2">
                        <Select
                          aria-label="Função"
                          selectedKeys={[member.role]}
                          size="sm"
                          isDisabled={member.id === currentUserId} // Não pode alterar próprio role
                          onSelectionChange={(keys) => {
                            const newRole = Array.from(keys)[0] as Role;
                            if (newRole !== member.role) {
                              updateMutation.mutate({ userId: member.id, role: newRole });
                            }
                          }}
                        >
                          <SelectItem key="collaborator">Colaborador</SelectItem>
                          <SelectItem key="admin">Administrador</SelectItem>
                        </Select>
                      </td>
                      <td className="py-2">
                        {member.role === "admin" ? (
                          <Chip size="sm" variant="flat" color="primary">Acesso total</Chip>
                        ) : (
                          <div className="flex gap-3">
                            <Switch
                              size="sm"
                              isSelected={!!member.permissions?.manage_clients}
                              onValueChange={(v) =>
                                updateMutation.mutate({ userId: member.id, permissions: { ...member.permissions, manage_clients: v } })
                              }
                            >
                              Clientes
                            </Switch>
                            <Switch
                              size="sm"
                              isSelected={!!member.permissions?.manage_campaigns}
                              onValueChange={(v) =>
                                updateMutation.mutate({ userId: member.id, permissions: { ...member.permissions, manage_campaigns: v } })
                              }
                            >
                              Campanhas
                            </Switch>
                            <Switch
                              size="sm"
                              isSelected={!!member.permissions?.view_all_metrics}
                              onValueChange={(v) =>
                                updateMutation.mutate({ userId: member.id, permissions: { ...member.permissions, view_all_metrics: v } })
                              }
                            >
                              Métricas
                            </Switch>
                          </div>
                        )}
                      </td>
                      <td className="py-2">
                        {member.id === currentUserId ? (
                          <Chip size="sm" color="primary" variant="flat">
                            Você
                          </Chip>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              color="warning"
                              onPress={() => updateMutation.mutate({ userId: member.id, role: "collaborator", permissions: { manage_clients: false, manage_campaigns: false, view_all_metrics: false } })}
                            >
                              Revogar
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="danger"
                              onPress={() => {
                                if (confirm(`Tem certeza que deseja remover ${member.email} do sistema? Esta ação não pode ser desfeita.`)) {
                                  removeMutation.mutate(member.id);
                                }
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Convites Pendentes</h2>
          <p className="text-sm text-default-500">
            Usuários convidados que ainda não confirmaram o email. Eles receberam um email de confirmação para definir senha.
          </p>
        </CardHeader>
        <CardBody>
          {isLoadingPending ? (
            <div className="py-8 text-center text-default-500">Carregando convites...</div>
          ) : (pending || []).length === 0 ? (
            <div className="py-8 text-center text-default-500">Nenhum convite pendente</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-default-500 border-b">
                    <th className="py-2">Email</th>
                    <th className="py-2">Função</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pending!.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-b-0">
                      <td className="py-2">{inv.email}</td>
                      <td className="py-2">{inv.role || "—"}</td>
                      <td className="py-2">
                        <Chip size="sm" color="warning" variant="flat">
                          Aguardando confirmação
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

