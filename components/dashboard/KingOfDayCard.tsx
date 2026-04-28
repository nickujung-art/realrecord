import { Crown, MapPin, Building2, ArrowUp } from "lucide-react";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { DirectDealBadge } from "@/components/ui/DirectDealBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatManwonShort, formatManwon, formatDelta } from "@/lib/utils/formatPrice";
import type { KingOfDayData } from "@/types/api";

interface KingOfDayCardProps {
  data: KingOfDayData | null;
  isLoading?: boolean;
}

export function KingOfDayCard({ data, isLoading = false }: KingOfDayCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl p-7 min-h-[200px] flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #0d9488 100%)" }}
      >
        <Skeleton className="w-40 h-5 bg-white/20" />
        <div className="space-y-3 mt-4">
          <Skeleton className="w-56 h-8 bg-white/20" />
          <Skeleton className="w-32 h-12 bg-white/30" />
          <Skeleton className="w-48 h-4 bg-white/20" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="rounded-2xl p-7 min-h-[200px] flex flex-col items-center justify-center text-white/60"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #0d9488 100%)" }}
      >
        <Building2 size={40} className="mb-3 opacity-40" />
        <p className="text-sm">오늘 등록된 거래가 없습니다</p>
      </div>
    );
  }

  const sqm = Math.round(data.areaPyeong * 3.305785);
  const contractDate = new Date(data.contractDate).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="rounded-2xl p-7 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0d9488 100%)",
        boxShadow: "0 8px 32px 0 rgb(30 58 138 / 0.35)",
      }}
    >
      {/* 배경 장식 */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
      />

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
          <Crown size={13} className="text-amber-300" />
          <span className="text-white/90 text-xs font-semibold tracking-wide">
            KING OF THE DAY
          </span>
        </div>
        <span className="text-white/50 text-xs">{contractDate} 계약</span>
      </div>

      {/* 단지명 + 배지 */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-white font-bold text-xl leading-tight">
          {data.complexName}
        </h3>
        {data.hasWarning && <WarningBadge size="sm" />}
        {data.directDeal && <DirectDealBadge size="sm" />}
      </div>

      {/* 위치 */}
      <div className="flex items-center gap-1 text-white/60 text-sm mb-4">
        <MapPin size={13} />
        <span>
          {data.city} {data.dong}
        </span>
        <span className="mx-1 opacity-40">·</span>
        <span>
          {sqm}㎡ ({data.areaPyeong}평)
        </span>
        <span className="mx-1 opacity-40">·</span>
        <span>{data.floor}층</span>
      </div>

      {/* 가격 */}
      <div className="flex items-end gap-4">
        <div>
          <div className="text-white/50 text-xs mb-0.5">거래가</div>
          <div
            className="font-bold text-price leading-none"
            style={{ fontSize: "2.5rem", color: "#5eead4" }}
          >
            {formatManwonShort(data.priceManwon)}
          </div>
          <div className="text-white/50 text-xs mt-0.5">
            {formatManwon(data.priceManwon)}
          </div>
        </div>

        {data.priceDelta != null && data.priceDelta > 0 && (
          <div className="mb-1 flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1.5">
            <ArrowUp size={13} className="text-accent-400" />
            <span className="text-accent-400 text-sm font-semibold">
              {formatDelta(data.priceDelta)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
