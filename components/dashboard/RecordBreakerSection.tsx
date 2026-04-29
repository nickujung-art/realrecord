import { TrendingUp } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecordBreakerList } from "./RecordBreakerList";
import type { RecordBreakerItem } from "@/types/api";

interface RecordBreakerSectionProps {
  items: RecordBreakerItem[];
}

export function RecordBreakerSection({ items }: RecordBreakerSectionProps) {
  return (
    <>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Record Breakers</h2>
          <p className="text-xs text-gray-500 mt-0.5">최근 신고가 갱신 단지</p>
        </div>
      </div>

      <SectionHeader
        title="신고가 랭킹"
        subtitle="최근 신고가 갱신 단지"
        icon={<TrendingUp size={14} strokeWidth={1.5} />}
      />

      <div className="card p-2">
        <RecordBreakerList items={items} />
      </div>
    </>
  );
}
