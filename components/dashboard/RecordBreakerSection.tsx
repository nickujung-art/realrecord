import { RecordBreakerList } from "./RecordBreakerList";
import type { RecordBreakerItem } from "@/types/api";

interface RecordBreakerSectionProps {
  items: RecordBreakerItem[];
}

export function RecordBreakerSection({ items }: RecordBreakerSectionProps) {
  return (
    <>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">🔥 Record Breakers</h2>
        <p className="text-sm text-slate-500 mt-0.5">최근 신고가 갱신 단지</p>
      </div>
      <div className="card p-2">
        <RecordBreakerList items={items} />
      </div>
    </>
  );
}
