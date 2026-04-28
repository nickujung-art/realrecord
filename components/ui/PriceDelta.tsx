import { TrendingUp, TrendingDown } from "lucide-react";
import { formatDelta, formatPercent } from "@/lib/utils/formatPrice";

interface PriceDeltaProps {
  delta: number;
  percent?: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function PriceDelta({
  delta,
  percent,
  size = "md",
  showIcon = true,
}: PriceDeltaProps) {
  const isPositive = delta >= 0;
  const colorClass = isPositive ? "text-positive-600" : "text-negative-600";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  const sizeClasses = {
    sm: "text-xs gap-0.5",
    md: "text-sm gap-1",
    lg: "text-base gap-1",
  };
  const iconSize = { sm: 11, md: 13, lg: 15 }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold ${colorClass} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSize} />}
      <span>{formatDelta(delta)}</span>
      {percent != null && (
        <span className="opacity-75">({formatPercent(percent)})</span>
      )}
    </span>
  );
}
