import { Crown, MapPin, Building2 } from "lucide-react";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { DirectDealBadge } from "@/components/ui/DirectDealBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatManwonShort, formatManwon } from "@/lib/utils/formatPrice";
import type { KingOfDayData } from "@/types/api";

const CARD_STYLE = {
  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 55%, #1e3a8a 100%)",
  boxShadow: "0 8px 32px 0 rgb(30 58 138 / 0.22)",
} as const;

interface KingOfDayCardProps {
  data: KingOfDayData | null;
  isLoading?: boolean;
}

export function KingOfDayCard({ data, isLoading = false }: KingOfDayCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-[14px] p-5 min-h-[200px] flex flex-col justify-between" style={CARD_STYLE}>
        <Skeleton className="w-40 h-3.5 opacity-20" />
        <div className="space-y-3 mt-4">
          <Skeleton className="w-48 h-5 opacity-20" />
          <Skeleton className="w-32 h-10 opacity-20" />
          <Skeleton className="w-40 h-3.5 opacity-20" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[14px] p-5 min-h-[200px] flex flex-col items-center justify-center" style={CARD_STYLE}>
        <Building2 size={32} strokeWidth={1.5} className="text-white/30 mb-3" />
        <p className="text-sm text-white/50">오늘 등록된 거래가 없습니다</p>
      </div>
    );
  }

  const sqm = Math.round(data.areaPyeong * 3.305785);
  const contractDate = new Date(data.contractDate).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-[14px] p-5 flex flex-col justify-between min-h-[220px]" style={CARD_STYLE}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Crown size={13} strokeWidth={1.5} className="text-amber-300 flex-shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
          King of the Day
        </span>
        <span className="text-white/40 text-[10px] ml-auto whitespace-nowrap">
          {contractDate} 계약
        </span>
      </div>

      {/* 단지명 + 배지 */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-white font-bold text-lg leading-snug break-keep">
          {data.complexName}
        </h3>
        {data.hasWarning && <WarningBadge size="sm" />}
        {data.directDeal && <DirectDealBadge size="sm" />}
      </div>

      {/* 위치·면적·층 */}
      <div className="flex items-center gap-1 text-white/60 text-xs mb-4 flex-wrap leading-relaxed">
        <MapPin size={11} strokeWidth={1.5} className="flex-shrink-0" />
        <span>{data.city} {data.dong}</span>
        <span className="text-white/30">·</span>
        <span>{sqm}㎡ ({data.areaPyeong}평)</span>
        <span className="text-white/30">·</span>
        <span>{data.floor}층</span>
      </div>

      {/* 가격 */}
      <div>
        <div className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">
          거래가
        </div>
        <div className="text-price text-3xl font-bold text-accent-400 leading-none">
          {formatManwonShort(data.priceManwon)}
        </div>
        <div className="text-white/50 text-xs mt-1.5 tabular-nums">
          {formatManwon(data.priceManwon)}
        </div>
      </div>
    </div>
  );
}
