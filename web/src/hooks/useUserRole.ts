"use client";

import { useEffect, useState } from "react";

import { createSupabaseClient } from "@/lib/supabaseClient";

export type UserRole = 'admin' | 'client' | 'collaborator' | null;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  client?: {
    id: string;
    name: string;
  };
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Buscar perfil do usuário
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !userProfile) {
          console.error('Erro ao buscar perfil:', error);
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Se for cliente, buscar dados do cliente
        if (userProfile.role === 'client') {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, name')
            .eq('user_id', user.id)
            .single();

          setProfile({
            ...userProfile,
            client: clientData || undefined
          });
        } else {
          setProfile(userProfile);
        }

        setRole(userProfile.role as UserRole);
      } catch (error) {
        console.error('Erro ao buscar role do usuário:', error);
        setRole(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return {
    role,
    profile,
    loading,
    isAdmin: role === 'admin',
    isClient: role === 'client',
    isCollaborator: role === 'collaborator',
  };
}