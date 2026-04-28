import { TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { DirectDealBadge } from "@/components/ui/DirectDealBadge";
import { PriceDelta } from "@/components/ui/PriceDelta";
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

function RecordBreakerItemRow({ item }: { item: RecordBreakerItem }) {
  const sqm = Math.round(item.areaPyeong * 3.305785);

  return (
    <Link
      href={`/apartments/${item.complexId}?pyeong=${item.areaPyeong}`}
      className="flex items-center gap-3 p-3.5 rounded-lg hover:bg-gray-50 transition-colors duration-100 group"
    >
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
        <TrendingUp size={14} className="text-primary-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-gray-900 text-sm truncate flex-1 min-w-0">
            {item.complexName}
          </span>
          <span className="flex-shrink-0 flex items-center gap-1">
            {item.hasWarning && <WarningBadge size="sm" />}
            {item.directDeal && <DirectDealBadge size="sm" />}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-gray-500 truncate min-w-0">{item.dong}</span>
          <span className="text-gray-300 text-xs flex-shrink-0">·</span>
          <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">
            {sqm}㎡
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-price text-primary-900">
          {formatManwonShort(item.newPrice)}
        </div>
        <div className="mt-0.5">
          <PriceDelta delta={item.priceDelta} percent={item.deltaPercent} size="sm" />
        </div>
      </div>

      <ChevronRight
        size={15}
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
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5">
            <Skeleton variant="block" className="w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="line" className="w-32 h-3.5" />
              <Skeleton variant="line" className="w-20 h-3" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton variant="line" className="w-16 h-4" />
              <Skeleton variant="line" className="w-20 h-3" />
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
          <p className="text-sm font-semibold text-gray-700">
            앗, 최근 30일간 새로운 신고가는 없었어요 😅
          </p>
          <p className="text-xs text-gray-500 mt-1">
            대신 이번 달 가장 거래가 활발했던 인기 단지를 보여드릴게요!
          </p>
        </div>
        <div className="mt-1 divide-y divide-gray-100">
          {POPULAR_COMPLEXES_MOCK.map((c) => (
            <div key={c.rank} className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-700">{c.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-900 text-sm">{c.complexName}</span>
                <span className="text-gray-300 mx-1.5 text-xs">·</span>
                <span className="text-xs text-gray-500">{c.dong}</span>
              </div>
              <span className="text-sm font-semibold text-slate-600 flex-shrink-0">
                {c.transactionCount}건
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.slice(0, maxItems).map((item) => (
        <RecordBreakerItemRow key={`${item.complexId}-${item.areaPyeong}`} item={item} />
      ))}
    </div>
  );
}
