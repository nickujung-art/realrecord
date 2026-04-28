import { TrendingUp, AlertCircle, XCircle, Building2 } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import type { DashboardStats } from "@/types/api";

interface DashboardStatsProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading = false }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="최근 거래"
        value={isLoading ? "-" : stats?.todayTransactionCount ?? 0}
        subValue="건"
        icon={<TrendingUp size={16} />}
        isLoading={isLoading}
      />
      <StatCard
        label="신고가 경신"
        value={isLoading ? "-" : stats?.todayNewRecordCount ?? 0}
        subValue="건"
        icon={<AlertCircle size={16} />}
        trend={stats?.todayNewRecordCount ? "up" : "neutral"}
        trendValue={stats?.todayNewRecordCount ? "최근 갱신" : undefined}
        isLoading={isLoading}
      />
      <StatCard
        label="취소 감지"
        value={isLoading ? "-" : stats?.todayCancellationCount ?? 0}
        subValue="건 (7일)"
        icon={<XCircle size={16} />}
        trend={stats?.todayCancellationCount ? "down" : "neutral"}
        isLoading={isLoading}
      />
      <StatCard
        label="추적 단지"
        value={isLoading ? "-" : stats?.totalComplexCount ?? 0}
        subValue="개"
        icon={<Building2 size={16} />}
        isLoading={isLoading}
      />
    </div>
  );
}
