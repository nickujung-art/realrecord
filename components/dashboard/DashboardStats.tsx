import { StatCard } from "@/components/ui/StatCard";
import type { DashboardStats } from "@/types/api";

// ── 커스텀 SVG 아이콘 (부동산 맥락 전용) ──────────────────────────────────────

function IconRecentTrade() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M2 4.5h8M7.5 2l2.5 2.5L7.5 7"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M13 10.5H5M7.5 8l-2.5 2.5L7.5 13"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNewRecord() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M7.5 2v7M7.5 2L5 4.5M7.5 2L10 4.5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M3 9l1.5 3h6L12 9"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <line x1="2.5" y1="12.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconCancellation() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M7.5 1.5L2 4v5c0 2.5 2.5 4.5 5.5 4.5S13 11.5 13 9V4L7.5 1.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M5.5 6.5l4 4M9.5 6.5l-4 4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  );
}

function IconComplexes() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="4" width="5" height="9.5" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="6.5" width="5" height="7" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <line x1="3.5" y1="6.5" x2="4.5" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3.5" y1="8.5" x2="4.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10.5" y1="9" x2="11.5" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10.5" y1="11" x2="11.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface DashboardStatsProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading = false }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <StatCard
        label="최근 거래"
        value={isLoading ? "-" : stats?.todayTransactionCount ?? 0}
        subValue="건"
        icon={<IconRecentTrade />}
        isLoading={isLoading}
      />
      <StatCard
        label="신고가 경신"
        value={isLoading ? "-" : stats?.todayNewRecordCount ?? 0}
        subValue="건"
        icon={<IconNewRecord />}
        trend={stats?.todayNewRecordCount ? "up" : "neutral"}
        trendValue={stats?.todayNewRecordCount ? "최근 갱신" : undefined}
        isLoading={isLoading}
      />
    </div>
  );
}
