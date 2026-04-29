import { TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { DirectDealBadge } from "@/components/ui/DirectDealBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatManwonShort } from "@/lib/utils/formatPrice";
import type { RecordBreakerItem } from "@/types/api";

const POPULAR_COMPLEXES_MOCK = [
  { rank: 1, complexName: "용지아이파크", dong: "용지동", transactionCount: 14 },
  { rank: 2, complexName: "창원중동유니시티1단지", dong: "중동", transactionCount: 11 },
  { rank: 3, complexName: "창원더샵센트럴파크", dong: "용호동", transactionCount: 9 },
] as const;

interface RecordBreakerListProps {
  items: RecordBreakerItem[];
  isLoading?: boolean;
  maxItems?: number;
}

function formatDeltaCompact(deltaPercent: number, priceDelta: number): {
  text: string;
  arrow: "up" | "down" | "zero";
} {
  if (priceDelta === 0 || deltaPercent === 0) return { text: "±0%", arrow: "zero" };
  return {
    text: `${Math.abs(deltaPercent).toFixed(1)}%`,
    arrow: priceDelta > 0 ? "up" : "down",
  };
}

function RecordBreakerItemRow({ item }: { item: RecordBreakerItem }) {
  const sqm = Math.round(item.areaPyeong * 3.305785);
  const { text: deltaText, arrow } = formatDeltaCompact(item.deltaPercent, item.priceDelta);

  const deltaColorClass =
    arrow === "zero" ? "text-gray-400"
      : arrow === "up" ? "text-positive-600"
        : "text-negative-600";

  return (
    <Link
      href={`/apartments/${item.complexId}?pyeong=${item.areaPyeong}`}
      className="flex items-center gap-2.5 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-100 group"
    >
      {/* 트렌드 아이콘 */}
      <TrendingUp
        size={13}
        strokeWidth={1.5}
        className="text-primary-600 flex-shrink-0 self-start mt-0.5"
      />

      {/* 단지명 + 위치·면적 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-gray-900 text-sm leading-snug break-keep">
            {item.complexName}
          </span>
          {(item.hasWarning || item.directDeal) && (
            <span className="flex items-center gap-1 mt-0.5 flex-shrink-0">
              {item.hasWarning && <WarningBadge size="sm" />}
              {item.directDeal && <DirectDealBadge size="sm" />}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-gray-500 leading-none">{item.dong}</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium leading-none">
            {sqm}㎡
          </span>
        </div>
      </div>

      {/* 가격 + 델타 — 고정 너비, overflow 없음 */}
      <div className="flex-shrink-0 text-right min-w-[4.5rem]">
        <div className="text-sm font-bold text-price text-gray-900 whitespace-nowrap leading-none">
          {formatManwonShort(item.newPrice)}
        </div>
        <div className={`flex items-center justify-end gap-0.5 mt-1 ${deltaColorClass}`}>
          {arrow !== "zero" && (
            <span className="text-[9px] leading-none select-none">
              {arrow === "up" ? "▲" : "▼"}
            </span>
          )}
          <span className="text-[10px] font-semibold leading-none whitespace-nowrap">
            {deltaText}
          </span>
        </div>
      </div>

      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0"
      />
    </Link>
  );
}

export function RecordBreakerList({
  items,
  isLoading = false,
  maxItems = 10,
}: RecordBreakerListProps) {
  if (isLoading) {
    return (
      <div className="space-y-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-3">
            <Skeleton variant="block" className="w-3.5 h-3.5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="line" className="w-32 h-3.5" />
              <Skeleton variant="line" className="w-20 h-2.5" />
            </div>
            <div className="space-y-1.5 text-right min-w-[4.5rem]">
              <Skeleton variant="line" className="w-14 h-3.5 ml-auto" />
              <Skeleton variant="line" className="w-10 h-2.5 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <p className="text-sm font-semibold text-gray-600">
            최근 30일간 새로운 신고가는 없었어요
          </p>
          <p className="text-xs text-gray-400 mt-1">
            대신 이번 달 가장 거래가 활발했던 인기 단지를 보여드릴게요
          </p>
        </div>
        <div className="mt-1 divide-y divide-gray-100">
          {POPULAR_COMPLEXES_MOCK.map((c) => (
            <div key={c.rank} className="flex items-center gap-2.5 px-3 py-3">
              <span className="text-xs font-bold text-gray-400 w-4 text-center flex-shrink-0 tabular-nums">
                {c.rank}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-800 text-sm break-keep">
                  {c.complexName}
                </span>
                <span className="text-gray-300 mx-1.5 text-[10px]">·</span>
                <span className="text-xs text-gray-500">{c.dong}</span>
              </div>
              <span className="text-sm font-semibold text-gray-500 flex-shrink-0 tabular-nums">
                {c.transactionCount}건
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.slice(0, maxItems).map((item) => (
        <RecordBreakerItemRow key={`${item.complexId}-${item.areaPyeong}`} item={item} />
      ))}
    </div>
  );
}
