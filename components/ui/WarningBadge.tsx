import { Info } from "lucide-react";

interface WarningBadgeProps {
  cancellationCount?: number;
  lastCancelledAt?: string;
  size?: "sm" | "md";
}

export function WarningBadge({
  cancellationCount = 1,
  lastCancelledAt,
  size = "sm",
}: WarningBadgeProps) {
  const iconSize = size === "sm" ? 12 : 14;
  const lastDate = lastCancelledAt
    ? new Date(lastCancelledAt).toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <span className="relative inline-flex items-center group/warning">
      <span
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
          bg-gray-100 text-gray-600 border border-gray-200
          cursor-help transition-colors hover:bg-gray-200
          whitespace-nowrap
          ${size === "sm" ? "text-xs" : "text-sm"}
        `}
      >
        <Info size={iconSize} />
        <span className="font-medium">거래 알림</span>
      </span>

      {/* CSS Tooltip */}
      <span
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          w-52 px-3 py-2 rounded-lg
          bg-slate-900 text-white text-xs leading-relaxed
          opacity-0 pointer-events-none
          group-hover/warning:opacity-100
          transition-opacity duration-150
          shadow-lg
        "
      >
        <span className="font-semibold block mb-0.5">거래 취소 이력 있음</span>
        <span className="text-slate-300">
          최근 30일 내 취소 {cancellationCount}건
          {lastDate && ` (최근 ${lastDate})`}
        </span>
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}
