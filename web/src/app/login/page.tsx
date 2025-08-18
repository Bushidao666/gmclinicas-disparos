"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

import { createSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Buscar o role do usuário para redirecionar corretamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile?.role === "client") {
          router.replace("/client-dashboard");
        } else {
          router.replace("/dashboard");
        }
      } else {
        router.replace("/dashboard");
      }
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-primary-50/20 via-background to-primary-100/20">
      <div className="w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex p-4 bg-primary rounded-2xl shadow-lg mb-4">
            <Image 
              src="/gmlogo.png"
              alt="GM Clínicas"
              width={48}
              height={48}
              className="brightness-0 invert"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
            GM Disparos
          </h1>
          <p className="text-arsenic-500 mt-2">Sistema de disparos WhatsApp para agências</p>
        </div>
        
        {/* Formulário */}
        <form
          className="bg-white dark:bg-content1 p-8 rounded-2xl shadow-2xl border border-default-100 animate-slideInLeft"
          onSubmit={signIn}
        >
          <h2 className="text-2xl font-semibold text-gm-black dark:text-white mb-6">Fazer Login</h2>
          
          <div className="space-y-5">
            <Input
              isRequired
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="bordered"
              color="primary"
              classNames={{
                input: "text-arsenic-500",
                label: "text-arsenic-400",
                inputWrapper: "border-arsenic-200 hover:border-primary focus-within:!border-primary"
              }}
              startContent={
                <svg className="w-5 h-5 text-arsenic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />
            
            <Input
              isRequired
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="bordered"
              color="primary"
              classNames={{
                input: "text-arsenic-500",
                label: "text-arsenic-400",
                inputWrapper: "border-arsenic-200 hover:border-primary focus-within:!border-primary"
              }}
              startContent={
                <svg className="w-5 h-5 text-arsenic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm animate-fadeIn" role="alert">
              {error}
            </div>
          )}
          
          <Button 
            color="primary" 
            isLoading={loading} 
            type="submit"
            className="w-full mt-6 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          
          <div className="mt-6 text-center">
            <a href="/signup" className="text-sm text-primary hover:text-primary-600 transition-colors duration-300">
              Não tem uma conta? Cadastre-se
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
