"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="min-h-screen grid place-items-center p-4">
      <form
        className="w-full max-w-sm bg-content1 p-6 rounded-large grid gap-4"
        onSubmit={signIn}
      >
        <h1 className="text-xl font-semibold">Entrar</h1>
        <Input
          isRequired
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          isRequired
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div className="text-danger text-sm" role="alert">
            {error}
          </div>
        )}
        <Button color="primary" isLoading={loading} type="submit">
          Entrar
        </Button>
      </form>
    </main>
  );
}
