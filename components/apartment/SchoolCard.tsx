import { GraduationCap, MapPin, Clock, ExternalLink } from "lucide-react";
import type { SchoolInfoSummary } from "@/types/api";

interface SchoolCardProps {
  schoolInfos: SchoolInfoSummary[];
}

// ── 도보 시간 계산 (평균 보행 속도 4km/h) ───────────────────────────────────

function walkingMinutes(distanceM: number): number {
  // 4km/h = 66.7m/min
  return Math.max(1, Math.round(distanceM / 66.7));
}

// ── 학교 유형 배지 ────────────────────────────────────────────────────────────

const TYPE_CLASS: Record<string, string> = {
  공립: "bg-blue-50 text-blue-700",
  사립: "bg-purple-50 text-purple-700",
  국립: "bg-emerald-50 text-emerald-700",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_CLASS[type] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${cls}`}>
      {type}
    </span>
  );
}

// ── 개별 학교 행 ──────────────────────────────────────────────────────────────

function SchoolRow({ info, isFirst }: { info: SchoolInfoSummary; isFirst: boolean }) {
  const minutes = walkingMinutes(info.distance);

  return (
    <div className={`flex items-start gap-3 py-3.5 ${isFirst ? "" : "border-t border-slate-100"}`}>
      {/* 좌측: 등급 컬러 바 */}
      <div className="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5
        bg-gradient-to-b
        from-teal-400 to-teal-200"
        style={{
          background:
            info.grade === "상"
              ? "linear-gradient(to bottom, #14b8a6, #99f6e4)"
              : info.grade === "중"
              ? "linear-gradient(to bottom, #94a3b8, #cbd5e1)"
              : "linear-gradient(to bottom, #f87171, #fecaca)",
        }}
      />

      {/* 중앙: 학교 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{info.schoolName}</span>
          <TypeBadge type={info.schoolType} />
        </div>
        {info.address && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{info.address}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
            직선 {info.distance.toLocaleString()}m
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-teal-600">
            <Clock size={11} className="flex-shrink-0" />
            걸어서 약 {minutes}분
          </span>
        </div>
      </div>

      {/* 우측: 상세 링크 */}
      {info.schoolUrl ? (
        <a
          href={info.schoolUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg
            bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700
            text-xs font-medium transition-colors"
          title="학교 상세 정보 보기"
        >
          상세
          <ExternalLink size={10} />
        </a>
      ) : (
        <div className="w-14 flex-shrink-0" /> /* spacer */
      )}
    </div>
  );
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
        <GraduationCap size={18} className="text-slate-300" />
      </div>
      <p className="text-sm text-slate-400 font-medium">근처 학교 정보를 불러오는 중입니다</p>
      <p className="text-xs text-slate-300">
        학교알리미 데이터 연동 후 표시됩니다
      </p>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function SchoolCard({ schoolInfos }: SchoolCardProps) {
  return (
    <div className="card p-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap size={15} className="text-slate-700" />
        <p className="text-sm font-bold text-slate-900">학군 정보</p>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        학교알리미 기준 · 도보 4km/h 환산
      </p>

      {/* 학교 목록 or 빈 상태 */}
      {schoolInfos.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {schoolInfos.map((info, idx) => (
            <SchoolRow key={info.id} info={info} isFirst={idx === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
