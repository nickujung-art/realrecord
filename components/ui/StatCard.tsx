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
      <div className="card p-4 sm:p-5 flex flex-col gap-3">
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
    <div className="card p-4 sm:p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          {label}
        </span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-price text-gray-900 leading-none">
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-gray-500 leading-none mb-0.5">
            {subValue}
          </span>
        )}
      </div>

      {trendValue && trend && (
        <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${trendColor}`}>
          <TrendIcon size={11} strokeWidth={1.5} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
