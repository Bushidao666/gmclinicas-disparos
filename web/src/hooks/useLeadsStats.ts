"use client";

import { useQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths, format } from "date-fns";

import { createSupabaseClient } from "@/lib/supabaseClient";

interface LeadsStats {
  totalLeads: number;
  activeLeads: number;
  optedOutLeads: number;
  optOutRate: number;
  growthRate: number;
  monthlyGrowth: Array<{
    month: string;
    total: number;
    new: number;
    optedOut: number;
  }>;
  tagDistribution: Array<{
    tag: string;
    count: number;
    percentage: number;
  }>;
  qualityMetrics: {
    validNumbers: number;
    invalidNumbers: number;
    duplicates: number;
  };
}

export function useLeadsStats(clientId: string | null) {
  const supabase = createSupabaseClient();

  return useQuery({
    queryKey: ["leads-stats", clientId],
    queryFn: async (): Promise<LeadsStats> => {
      if (!clientId) {
        return {
          totalLeads: 0,
          activeLeads: 0,
          optedOutLeads: 0,
          optOutRate: 0,
          growthRate: 0,
          monthlyGrowth: [],
          tagDistribution: [],
          qualityMetrics: {
            validNumbers: 0,
            invalidNumbers: 0,
            duplicates: 0,
          },
        };
      }

      // Buscar estatísticas básicas
      const [totalResult, activeResult, optedOutResult] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId),
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId)
          .eq("is_opted_out", false),
        supabase
          .from("leads")
          .select("id", { count: "exact" })
          .eq("client_id", clientId)
          .eq("is_opted_out", true),
      ]);

      const totalLeads = totalResult.count ?? 0;
      const activeLeads = activeResult.count ?? 0;
      const optedOutLeads = optedOutResult.count ?? 0;
      const optOutRate = totalLeads > 0 ? (optedOutLeads / totalLeads) * 100 : 0;

      // Buscar dados dos últimos 6 meses para crescimento
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      const { data: monthlyData } = await supabase
        .from("leads")
        .select("created_at, is_opted_out")
        .eq("client_id", clientId)
        .gte("created_at", sixMonthsAgo.toISOString());

      // Processar dados mensais
      const monthlyGrowth: LeadsStats["monthlyGrowth"] = [];
      const monthlyMap = new Map<string, { total: number; new: number; optedOut: number }>();

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyMap.set(monthKey, { total: 0, new: 0, optedOut: 0 });
      }

      // Acumular dados
      let cumulativeTotal = 0;
      (monthlyData ?? []).forEach((lead) => {
        const monthKey = format(new Date(lead.created_at), "yyyy-MM");
        if (monthlyMap.has(monthKey)) {
          const month = monthlyMap.get(monthKey)!;
          month.new += 1;
          cumulativeTotal += 1;
          month.total = cumulativeTotal;
          if (lead.is_opted_out) {
            month.optedOut += 1;
          }
        }
      });

      // Converter para array
      monthlyMap.forEach((data, monthKey) => {
        monthlyGrowth.push({
          month: format(new Date(monthKey + "-01"), "MMM yyyy"),
          ...data,
        });
      });

      // Calcular taxa de crescimento (comparando último mês com mês anterior)
      let growthRate = 0;
      if (monthlyGrowth.length >= 2) {
        const lastMonth = monthlyGrowth[monthlyGrowth.length - 1];
        const previousMonth = monthlyGrowth[monthlyGrowth.length - 2];
        if (previousMonth.total > 0) {
          growthRate = ((lastMonth.new - previousMonth.new) / previousMonth.new) * 100;
        }
      }

      // Buscar distribuição de tags
      const { data: leadsWithTags } = await supabase
        .from("leads")
        .select("tags")
        .eq("client_id", clientId)
        .not("tags", "is", null);

      // Processar tags
      const tagCount = new Map<string, number>();
      (leadsWithTags ?? []).forEach((lead) => {
        if (Array.isArray(lead.tags)) {
          lead.tags.forEach((tag: string) => {
            tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
          });
        }
      });

      // Converter para array e calcular percentuais
      const tagDistribution = Array.from(tagCount.entries())
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 tags

      // Métricas de qualidade (simplificadas por enquanto)
      const qualityMetrics = {
        validNumbers: activeLeads, // Assumindo que números ativos são válidos
        invalidNumbers: 0, // Precisaria de validação específica
        duplicates: 0, // Precisaria de query específica
      };

      return {
        totalLeads,
        activeLeads,
        optedOutLeads,
        optOutRate,
        growthRate,
        monthlyGrowth,
        tagDistribution,
        qualityMetrics,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}