"use client";

import { useEffect, useState } from "react";
import { Receipt, School, Sun, Snowflake, ChevronDown, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SchoolInfoSummary } from "@/types/api";

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MonthlyTrendPoint {
  month: string; // "YYYYMM" e.g. "202412"
  fee: number;
}

interface MaintenanceSummary {
  average: number | null;
  summer: number | null;
  winter: number | null;
  monthlyTrend: MonthlyTrendPoint[];
}

interface ComplexConditionBentoProps {
  complexId: string;
  targetArea: number;
  selectedPyeong: number;
  schoolInfos: SchoolInfoSummary[];
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function walkingMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 66.7));
}

function formatWon(won: number | null): string {
  if (won === null) return "—";
  return `${(won / 10000).toFixed(1)}만 원`;
}

// "202412" → "'24.12"
function formatYearMonth(ym: string): string {
  return `'${ym.slice(2, 4)}.${ym.slice(4)}`;
}

// ── SVG 스파크라인 유틸 ────────────────────────────────────────────────────────
// viewBox 0 0 100 28 기준으로 좌표를 계산해 <polyline points="..."> 문자열 반환

function toSparklinePoints(trend: MonthlyTrendPoint[]): string {
  if (trend.length < 2) return "";
  const fees = trend.map((d) => d.fee);
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  const range = max - min || 1; // 모든 값이 동일한 경우 0 나눗셈 방지
  const W = 100, H = 28, PX = 2, PY = 3;

  return trend
    .map((pt, i) => {
      const x = PX + (i / (trend.length - 1)) * (W - PX * 2);
      const y = PY + ((max - pt.fee) / range) * (H - PY * 2); // SVG y축 반전
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// ── 계절성 분석 문구 ───────────────────────────────────────────────────────────

function analyzeSeasonality({ average, summer, winter }: MaintenanceSummary): string {
  if (!average || average === 0) return "분석할 데이터가 충분하지 않습니다.";

  const sDiff = summer != null ? Math.round(((summer - average) / average) * 100) : null;
  const wDiff = winter != null ? Math.round(((winter - average) / average) * 100) : null;

  if (sDiff !== null && sDiff >= 10)
    return `여름철(6–8월) 관리비가 연평균보다 ${sDiff}% 높습니다. 냉방 비중이 큰 단지입니다.`;
  if (wDiff !== null && wDiff >= 10)
    return `겨울철(12–2월) 관리비가 연평균보다 ${wDiff}% 높습니다. 난방 비중이 큰 단지입니다.`;
  if (sDiff !== null && sDiff <= -10)
    return `여름철 관리비가 연평균보다 ${Math.abs(sDiff)}% 낮습니다. 냉방 효율이 좋은 단지입니다.`;

  const maxDiff = Math.max(Math.abs(sDiff ?? 0), Math.abs(wDiff ?? 0));
  return maxDiff < 5
    ? "계절별 관리비 편차가 매우 적습니다. 연간 지출 예측이 쉬운 단지입니다."
    : "계절별 관리비 변동이 보통 수준입니다.";
}

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────

function MaintenanceSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton variant="circle" className="w-4 h-4" />
        <Skeleton variant="line" className="w-12" />
      </div>
      <div className="mb-3 space-y-1.5">
        <Skeleton variant="line" className="w-16 h-3" />
        <Skeleton className="w-36 h-8" />
      </div>
      {/* 스파크라인 스켈레톤 */}
      <Skeleton className="w-full h-7 mb-3" />
      <div className="pt-3 border-t border-gray-50 space-y-2.5">
        <div className="flex justify-between">
          <Skeleton variant="line" className="w-24 h-3" />
          <Skeleton variant="line" className="w-16 h-3" />
        </div>
        <div className="flex justify-between">
          <Skeleton variant="line" className="w-24 h-3" />
          <Skeleton variant="line" className="w-16 h-3" />
        </div>
      </div>
    </div>
  );
}

// ── 관리비 카드 ───────────────────────────────────────────────────────────────

interface MaintenanceCardProps {
  data: MaintenanceSummary;
  selectedPyeong: number;
}

function MaintenanceCard({ data, selectedPyeong }: MaintenanceCardProps) {
  const [open, setOpen] = useState(false);

  const sparklinePoints = toSparklinePoints(data.monthlyTrend);
  const analysisText = analyzeSeasonality(data);
  const maxFee = data.monthlyTrend.length > 0 ? Math.max(...data.monthlyTrend.map((d) => d.fee)) : 1;

  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Receipt size={14} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">관리비</span>
        {selectedPyeong > 0 && (
          <span className="text-xs text-gray-400">({selectedPyeong}평 기준)</span>
        )}
      </div>

      {/* 메인 수치 */}
      <div className="mb-3">
        <p className="text-3xl font-bold tracking-tight text-gray-800">
          {formatWon(data.average)}
        </p>
      </div>

      {/* SVG 스파크라인 ─────────────────────────────────────────────────────── */}
      {sparklinePoints && (
        <div className="group/sparkline mb-3 -mx-1 px-1">
          <svg
            viewBox="0 0 100 28"
            preserveAspectRatio="none"
            className="w-full h-7"
            aria-hidden="true"
          >
            <polyline
              points={sparklinePoints}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-200 group-hover/sparkline:stroke-gray-400 transition-colors duration-200"
            />
          </svg>
        </div>
      )}

      {/* 계절별 구분선 + 행 */}
      <div className="pt-3 border-t border-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Sun size={11} className="text-amber-400" />
            하절기 (6–8월)
          </span>
          <span className="text-xs font-medium text-gray-600">{formatWon(data.summer)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Snowflake size={11} className="text-sky-400" />
            동절기 (12–2월)
          </span>
          <span className="text-xs font-medium text-gray-600">{formatWon(data.winter)}</span>
        </div>
      </div>

      {/* Accordion 토글 ──────────────────────────────────────────────────────── */}
      {data.monthlyTrend.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 w-full flex items-center justify-between text-xs text-gray-400
              hover:text-gray-600 transition-colors duration-150 pt-2 border-t border-gray-50"
          >
            <span>월별 상세 내역</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {/* Accordion 콘텐츠 */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              open ? "max-h-[360px] opacity-100 mt-3" : "max-h-0 opacity-0"
            }`}
          >
            {/* 분석 인사이트 */}
            <p className="text-xs text-gray-500 leading-relaxed mb-3 pb-3 border-b border-gray-50">
              {analysisText}
            </p>

            {/* 월별 목록 + 상대 바 */}
            <div className="space-y-1.5">
              {data.monthlyTrend.map(({ month, fee }) => (
                <div key={month} className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-xs text-gray-400 tabular-nums">
                    {formatYearMonth(month)}
                  </span>
                  <div className="flex-1 h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-200 rounded-full"
                      style={{ width: `${Math.round((fee / maxFee) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-gray-600 tabular-nums">
                    {formatWon(fee)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 학군 카드 (초/중/고 분리) ─────────────────────────────────────────────────

type SchoolLevel = "초등학교" | "중학교" | "고등학교";

const LEVEL_ORDER: SchoolLevel[] = ["초등학교", "중학교", "고등학교"];
const LEVEL_BADGE: Record<SchoolLevel, string> = {
  "초등학교": "초",
  "중학교": "중",
  "고등학교": "고",
};

function SchoolBentoCard({ schoolInfos }: { schoolInfos: SchoolInfoSummary[] }) {
  if (schoolInfos.length === 0) {
    return (
      <div className="p-5 rounded-2xl border border-gray-100 bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <School size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">학군</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <School size={22} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">주변 학교 정보가 없습니다</p>
          <p className="text-xs text-gray-300 mt-0.5">학교알리미 데이터 연동 후 표시됩니다</p>
        </div>
      </div>
    );
  }

  const byLevel = new Map(
    schoolInfos
      .filter((s) => s.schoolLevel !== null)
      .map((s) => [s.schoolLevel as SchoolLevel, s])
  );

  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <School size={14} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">학군</span>
      </div>

      {/* 초/중/고 행 */}
      <div className="space-y-0">
        {LEVEL_ORDER.map((level) => {
          const school = byLevel.get(level);
          const isLast = level === "고등학교";

          if (!school) {
            return (
              <div
                key={level}
                className={`flex items-center gap-3 py-3 ${!isLast ? "border-b border-gray-50" : ""}`}
              >
                <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-gray-300 flex items-center justify-center flex-shrink-0">
                  {LEVEL_BADGE[level]}
                </span>
                <span className="text-xs text-gray-300">정보 없음</span>
              </div>
            );
          }

          const mins = walkingMinutes(school.distance);
          const isChopuma = level === "초등학교" && !school.isEstimated && school.distance <= 600;

          return (
            <div
              key={level}
              className={`flex items-center gap-3 py-3 ${!isLast ? "border-b border-gray-50" : ""}`}
            >
              <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 flex items-center justify-center flex-shrink-0">
                {LEVEL_BADGE[level]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {school.schoolName}
                </p>
                {school.isEstimated ? (
                  <p className="text-xs text-amber-500 mt-0.5">거리 확인 중</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    도보 {mins}분
                    <span className="ml-1.5 text-gray-300">({school.distance.toLocaleString()}m)</span>
                  </p>
                )}
              </div>
              {isChopuma && (
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                  초품아
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function ComplexConditionBento({
  complexId,
  targetArea,
  selectedPyeong,
  schoolInfos,
}: ComplexConditionBentoProps) {
  const [data, setData] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setData(null);

    fetch(`/api/complex/${complexId}/maintenance-fee?targetArea=${targetArea}`)
      .then((res) => (res.ok ? (res.json() as Promise<MaintenanceSummary>) : Promise.reject()))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => {
        if (!cancelled)
          setData({ average: null, summer: null, winter: null, monthlyTrend: [] });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [complexId, targetArea]);

  const resolvedData = data ?? { average: null, summer: null, winter: null, monthlyTrend: [] };

  return (
    <div>
      {/* 섹션 제목 */}
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={15} className="text-gray-600" />
        <h2 className="text-sm font-bold text-gray-800">에듀 &amp; 리빙</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SchoolBentoCard schoolInfos={schoolInfos} />
        {loading ? (
          <MaintenanceSkeleton />
        ) : (
          <MaintenanceCard data={resolvedData} selectedPyeong={selectedPyeong} />
        )}
      </div>
    </div>
  );
}
