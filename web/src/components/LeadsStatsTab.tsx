"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Spinner } from "@heroui/spinner";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserX,
  Tags,
  Phone,
  AlertCircle,
} from "lucide-react";

import { useLeadsStats } from "@/hooks/useLeadsStats";

interface LeadsStatsTabProps {
  clientId: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color?: "default" | "primary" | "success" | "warning" | "danger";
}

function StatCard({ title, value, subtitle, icon, trend, color = "default" }: StatCardProps) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-danger" />
                ) : null}
                <span className={`text-sm ${trend > 0 ? "text-success" : trend < 0 ? "text-danger" : "text-gray-500"}`}>
                  {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function LeadsStatsTab({ clientId }: LeadsStatsTabProps) {
  const { data: stats, isLoading } = useLeadsStats(clientId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Estatísticas não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Leads"
          value={stats.totalLeads.toLocaleString("pt-BR")}
          icon={<Users className="w-5 h-5 text-primary" />}
          color="primary"
        />
        <StatCard
          title="Leads Ativos"
          value={stats.activeLeads.toLocaleString("pt-BR")}
          subtitle={`${((stats.activeLeads / stats.totalLeads) * 100).toFixed(1)}% do total`}
          icon={<Phone className="w-5 h-5 text-success" />}
          color="success"
        />
        <StatCard
          title="Taxa de Opt-out"
          value={`${stats.optOutRate.toFixed(1)}%`}
          subtitle={`${stats.optedOutLeads} leads`}
          icon={<UserX className="w-5 h-5 text-danger" />}
          color="danger"
        />
        <StatCard
          title="Crescimento Mensal"
          value={`${stats.growthRate > 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%`}
          trend={stats.growthRate}
          icon={<TrendingUp className="w-5 h-5 text-warning" />}
          color="warning"
        />
      </div>

      {/* Gráfico de crescimento mensal */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Evolução da Base de Leads</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {stats.monthlyGrowth.map((month, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{month.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">
                      +{month.new} novos
                    </span>
                    {month.optedOut > 0 && (
                      <span className="text-danger-600">
                        -{month.optedOut} opt-outs
                      </span>
                    )}
                    <span className="font-semibold">
                      Total: {month.total}
                    </span>
                  </div>
                </div>
                <Progress
                  value={(month.total / stats.totalLeads) * 100}
                  color="primary"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de tags */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Distribuição de Tags</h3>
            </div>
          </CardHeader>
          <CardBody>
            {stats.tagDistribution.length > 0 ? (
              <div className="space-y-3">
                {stats.tagDistribution.map((tag, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Chip size="sm" variant="flat">
                        {tag.tag}
                      </Chip>
                      <span className="text-sm text-gray-600">
                        {tag.count} ({tag.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={tag.percentage}
                      color="primary"
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">
                Nenhuma tag encontrada
              </p>
            )}
          </CardBody>
        </Card>

        {/* Métricas de qualidade */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <h3 className="text-lg font-semibold">Qualidade dos Dados</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-sm font-medium">Números Válidos</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats.qualityMetrics.validNumbers}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-danger rounded-full" />
                  <span className="text-sm font-medium">Números Inválidos</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats.qualityMetrics.invalidNumbers}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span className="text-sm font-medium">Duplicatas Removidas</span>
                </div>
                <span className="text-sm font-semibold">
                  {stats.qualityMetrics.duplicates}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}