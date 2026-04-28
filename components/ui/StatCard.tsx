import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "./Skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className="card p-5 flex flex-col gap-3">
        <Skeleton variant="line" className="w-24 h-3" />
        <Skeleton variant="line" className="w-20 h-7" />
        <Skeleton variant="line" className="w-16 h-3" />
      </div>
    );
  }

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-positive-600"
      : trend === "down"
        ? "text-negative-600"
        : "text-gray-400";

  return (
    <div className="card p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          {label}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-price text-slate-900">
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-slate-500 mb-0.5">{subValue}</span>
        )}
      </div>

      {trendValue && trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={12} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
