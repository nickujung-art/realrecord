import { UserRound } from "lucide-react";

interface DirectDealBadgeProps {
  size?: "sm" | "md";
}

export function DirectDealBadge({ size = "sm" }: DirectDealBadgeProps) {
  const iconSize = size === "sm" ? 11 : 13;
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
        bg-orange-50 text-warning-500 border border-orange-200
        font-medium whitespace-nowrap
        ${size === "sm" ? "text-xs" : "text-sm"}
      `}
      title="공인중개사 없이 당사자 간 직접 거래된 건입니다."
    >
      <UserRound size={iconSize} />
      직거래
    </span>
  );
}
