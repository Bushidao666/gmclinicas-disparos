"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { toast } from "sonner";
import { Lock, CheckCircle, User } from "lucide-react";

import { createSupabaseClient } from "@/lib/supabaseClient";

export default function SetupPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        // Verificar se o usuário está autenticado (veio do magic link)
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          toast.error("Sessão inválida. Por favor, use o link enviado por email.");
          router.replace("/login");
          return;
        }

        // Verificar se é a primeira vez configurando senha
        if (user.user_metadata?.password_set) {
          toast.info("Você já configurou sua senha");
          router.replace("/client-dashboard");
          return;
        }

        setUserEmail(user.email || "");
        setUserName(user.user_metadata?.full_name || user.user_metadata?.client_name || "");
        setVerifying(false);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        toast.error("Erro ao verificar sessão");
        router.replace("/login");
      }
    }

    checkSession();
  }, [router, supabase]);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      // Atualizar senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          password_set: true
        }
      });

      if (updateError) {
        console.error("Erro ao definir senha:", updateError);
        toast.error(updateError.message || "Erro ao definir senha");
        return;
      }

      // Buscar dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Criar ou atualizar perfil
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert({
            id: user.id,
            email: user.email,
            full_name: userName || user.user_metadata?.full_name || user.user_metadata?.client_name,
            role: 'client'
          });

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
        }
      }

      toast.success("Senha configurada com sucesso!", {
        description: "Você será redirecionado para o dashboard"
      });

      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        router.replace("/client-dashboard");
      }, 2000);

    } catch (error: any) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao configurar senha");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-0 pt-6 px-6 flex-col items-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center">Configure sua senha</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Crie uma senha segura para acessar sua conta
          </p>
        </CardHeader>
        
        <CardBody className="p-6">
          <div className="mb-6 p-4 bg-default-100 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-default-600" />
              <div>
                <p className="font-medium">{userName || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSetupPassword} className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={<Lock className="w-4 h-4 text-muted-foreground" />}
              isRequired
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              startContent={<Lock className="w-4 h-4 text-muted-foreground" />}
              isRequired
            />

            <div className="mt-6">
              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={loading}
                startContent={!loading && <CheckCircle className="w-4 h-4" />}
              >
                Configurar senha
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <p className="text-sm text-warning-600 dark:text-warning-400">
                <strong>Dica de segurança:</strong> Use uma senha única que você não use em outros sites. 
                Combine letras maiúsculas, minúsculas, números e símbolos.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}