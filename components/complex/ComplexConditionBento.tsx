"use client";

import { useEffect, useState } from "react";
import {
  Receipt, School, Sun, Snowflake, ChevronDown,
  GraduationCap, Car, BarChart2, Info, CalendarDays,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SchoolInfoSummary } from "@/types/api";

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MonthlyTrendPoint {
  month: string; // "YYYYMM"
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
  complexName: string;
  targetArea: number;
  selectedPyeong: number;
  schoolInfos: SchoolInfoSummary[];
  parkingCount: number | null;
  totalHouseholds: number | null;
  buildYear: number | null;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function walkingMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 66.7));
}

function formatWon(won: number | null): string {
  if (won === null) return "—";
  return `${(won / 10000).toFixed(1)}만 원`;
}

function formatYearMonth(ym: string): string {
  return `'${ym.slice(2, 4)}.${ym.slice(4)}`;
}

// ── SVG 스파크라인 ─────────────────────────────────────────────────────────────

function toSparklinePoints(trend: MonthlyTrendPoint[]): string {
  if (trend.length < 2) return "";
  const fees = trend.map((d) => d.fee);
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  const range = max - min || 1;
  const W = 100, H = 28, PX = 2, PY = 3;
  return trend
    .map((pt, i) => {
      const x = PX + (i / (trend.length - 1)) * (W - PX * 2);
      const y = PY + ((max - pt.fee) / range) * (H - PY * 2);
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

// ── 점수 산출 엔진 ─────────────────────────────────────────────────────────────
// 모든 점수 0–100, 최하점 40. null = Data Pending (그래프 점선 표시).

interface ScoreResult {
  score: number | null;
  reason: string;
}

const CURRENT_YEAR = new Date().getFullYear();

function computeEducationScore(schoolInfos: SchoolInfoSummary[]): ScoreResult {
  // 초등학교 우선, 이후 중/고 fallback (모두 isEstimated=false만)
  const reliable = schoolInfos.filter((s) => !s.isEstimated);
  const school =
    reliable.find((s) => s.schoolLevel === "초등학교") ??
    reliable.find((s) => s.schoolLevel === "중학교") ??
    reliable[0] ?? null;

  if (!school) {
    const hasEstimated = schoolInfos.some((s) => s.isEstimated);
    return {
      score: null,
      reason: hasEstimated
        ? "학교까지 거리를 정밀 측정 중입니다."
        : "인근 학교 정보가 없습니다.",
    };
  }

  const d = school.distance;
  const mins = walkingMinutes(d);
  // 300m 이내 100점, 1000m까지 선형 감쇄, 이후 최소 60점
  const raw = d <= 300 ? 100 : d <= 1000 ? 100 - ((d - 300) / 700) * 40 : 60;
  const score = Math.round(Math.min(100, Math.max(60, raw)));

  const proximity =
    d <= 300 ? "도보 5분 이내 초품아 수준입니다." :
      d <= 600 ? "매우 가까운 편입니다." :
        d <= 1000 ? "적당한 거리입니다." :
          "거리가 다소 있습니다.";

  return {
    score,
    reason: `${school.schoolName}까지 도보 ${mins}분 (${d.toLocaleString()}m). ${proximity}`,
  };
}

function computeParkingScore(parkingCount: number | null, totalHouseholds: number | null): ScoreResult {
  if (parkingCount === null || totalHouseholds === null || totalHouseholds === 0) {
    return { score: null, reason: "주차 대수 정보 수집 중입니다." };
  }
  const ratio = parkingCount / totalHouseholds;
  // 세대당 1.2대 = 80점 기준. clamp [40, 100].
  const raw = (ratio / 1.2) * 80;
  const score = Math.round(Math.min(100, Math.max(40, raw)));
  const ratioStr = ratio.toFixed(2);
  const comment =
    ratio >= 1.5 ? "주차 여건이 매우 우수합니다." :
      ratio >= 1.2 ? "1.2대/세대 기준을 충족합니다." :
        ratio >= 0.8 ? "평균 수준의 주차 공간입니다." :
          "주차 공간이 다소 부족할 수 있습니다.";
  return {
    score,
    reason: `세대당 ${ratioStr}대 (총 ${parkingCount.toLocaleString()}대 / ${totalHouseholds.toLocaleString()}세대). ${comment}`,
  };
}

function computeAgeScore(buildYear: number | null): ScoreResult {
  if (buildYear === null) {
    return { score: null, reason: "준공연도 데이터 수집 중입니다." };
  }
  const buildAge = CURRENT_YEAR - buildYear;
  // 신축에 가까울수록 고점, 30년차에서 40점(최하).
  const base = Math.max(40, 100 - buildAge * 2);
  // 30년 이상 구축: 재건축 잠재력 보너스 (최대 +20점).
  const rebuildBonus = buildAge >= 30 ? Math.min(20, (buildAge - 30) * 2) : 0;
  const score = Math.min(100, base + rebuildBonus);
  const comment =
    buildAge >= 30
      ? `재건축 잠재력을 인정해 점수에 가산했습니다.` :
      buildAge >= 15
        ? `안정적인 중간 연령 단지입니다.` :
        `비교적 신축 단지입니다.`;
  return {
    score,
    reason: `${buildYear}년 준공 (${buildAge}년차). ${comment}`,
  };
}

// ── 점수 바 컴포넌트 ──────────────────────────────────────────────────────────

function ScoreBar({
  label,
  icon,
  result,
  source,
}: {
  label: string;
  icon: React.ReactNode;
  result: ScoreResult;
  source: string;
}) {
  const { score, reason } = result;

  const barColor =
    score === null ? "" :
      score >= 80 ? "bg-teal-400" :
        score >= 60 ? "bg-amber-400" :
          "bg-orange-300";

  const numColor =
    score === null ? "text-gray-300" :
      score >= 80 ? "text-teal-600" :
        score >= 60 ? "text-amber-600" :
          "text-orange-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">{icon}</span>
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {/* CSS-only tooltip */}
          <div className="group/score-tip relative">
            <Info size={11} className="text-gray-300 cursor-default" strokeWidth={1.5} />
            <div
              className="absolute bottom-full left-0 mb-2 w-56 pointer-events-none z-20
                opacity-0 group-hover/score-tip:opacity-100 transition-opacity"
            >
              <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-lg">
                {reason}
                <p className="text-gray-400 mt-1.5 text-[10px]">출처: {source}</p>
              </div>
            </div>
          </div>
        </div>
        <span className={`text-sm font-bold tabular-nums ${numColor}`}>
          {score === null ? "—" : `${score}점`}
        </span>
      </div>

      {score === null ? (
        // Data Pending: 점선 바
        <div className="h-2 rounded-full border border-dashed border-gray-200 relative overflow-hidden flex items-center justify-center">
          <span className="text-[9px] text-gray-300 tracking-widest uppercase select-none">
            수집 중
          </span>
        </div>
      ) : (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── 종합 점수 카드 ─────────────────────────────────────────────────────────────

function ScoreSection({
  schoolInfos,
  parkingCount,
  totalHouseholds,
  buildYear,
  complexName,
}: {
  schoolInfos: SchoolInfoSummary[];
  parkingCount: number | null;
  totalHouseholds: number | null;
  buildYear: number | null;
  complexName: string;
}) {
  const education = computeEducationScore(schoolInfos);
  const parking = computeParkingScore(parkingCount, totalHouseholds);
  const age = computeAgeScore(buildYear);

  const subject = encodeURIComponent(`[리얼레코드] ${complexName} 데이터 수정 제보`);

  return (
    <div className="p-5 rounded-lg border border-gray-100 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={14} className="text-gray-400" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-gray-700">단지 종합 점수</span>
        <span className="text-xs text-gray-400">· 공공데이터 자동 산출</span>
      </div>

      <div className="space-y-4">
        <ScoreBar
          label="교육"
          icon={<School size={13} strokeWidth={1.5} />}
          result={education}
          source="학교알리미 (NEIS)"
        />
        <ScoreBar
          label="주차"
          icon={<Car size={13} strokeWidth={1.5} />}
          result={parking}
          source="국토교통부 K-APT"
        />
        <ScoreBar
          label="연차"
          icon={<CalendarDays size={13} strokeWidth={1.5} />}
          result={age}
          source="국토교통부 K-APT"
        />
      </div>

      {/* 피드백 슬롯 */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <p className="text-[10px] text-gray-300">
          점수는 공공데이터 기반 자동 산출값입니다
        </p>
        <a
          href={`mailto:nickujung@gmail.com?subject=${subject}`}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          실제 정보와 다른가요? 제보하기
        </a>
      </div>
    </div>
  );
}

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────

function MaintenanceSkeleton() {
  return (
    <div className="p-5 rounded-lg border border-gray-100 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton variant="circle" className="w-4 h-4" />
        <Skeleton variant="line" className="w-12" />
      </div>
      <div className="mb-3 space-y-1.5">
        <Skeleton variant="line" className="w-16 h-3" />
        <Skeleton className="w-36 h-8" />
      </div>
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
  const hasData = data.average !== null;

  return (
    <div className="p-5 rounded-lg border border-gray-100 bg-white flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Receipt size={14} className="text-gray-400" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-gray-700">관리비</span>
        {selectedPyeong > 0 && (
          <span className="text-xs text-gray-400">({selectedPyeong}평 기준)</span>
        )}
      </div>

      {/* 메인 수치 */}
      <div className="mb-3">
        {hasData ? (
          <p className="text-3xl font-bold tracking-tight text-gray-800">
            {formatWon(data.average)}
          </p>
        ) : (
          <div className="h-9 rounded border border-dashed border-gray-200 flex items-center px-3">
            <span className="text-xs text-gray-300 tracking-wide">데이터 수집 중</span>
          </div>
        )}
      </div>

      {/* 스파크라인 또는 Data Pending */}
      {sparklinePoints ? (
        <div className="group/sparkline mb-3 -mx-1 px-1">
          <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7" aria-hidden="true">
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
      ) : (
        <div className="mb-3 h-7 rounded border border-dashed border-gray-100 flex items-center justify-center">
          <span className="text-[10px] text-gray-300 tracking-wide">그래프 데이터 수집 중</span>
        </div>
      )}

      {/* 계절별 행 */}
      <div className="pt-3 border-t border-gray-50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Sun size={11} className="text-amber-400" />
            하절기 (6–8월)
          </span>
          {data.summer !== null ? (
            <span className="text-xs font-medium text-gray-600">{formatWon(data.summer)}</span>
          ) : (
            <span className="text-[10px] text-gray-300 italic">수집 중</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Snowflake size={11} className="text-sky-400" />
            동절기 (12–2월)
          </span>
          {data.winter !== null ? (
            <span className="text-xs font-medium text-gray-600">{formatWon(data.winter)}</span>
          ) : (
            <span className="text-[10px] text-gray-300 italic">수집 중</span>
          )}
        </div>
      </div>

      {/* 월별 상세 아코디언 */}
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
              strokeWidth={1.5}
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-[360px] opacity-100 mt-3" : "max-h-0 opacity-0"
              }`}
          >
            <p className="text-xs text-gray-500 leading-relaxed mb-3 pb-3 border-b border-gray-50">
              {analysisText}
            </p>
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

      <p className="text-[10px] text-gray-300 mt-auto pt-3">출처: 국토교통부 K-APT</p>
    </div>
  );
}

// ── 학군 카드 ─────────────────────────────────────────────────────────────────

type SchoolLevel = "초등학교" | "중학교" | "고등학교";
const LEVEL_ORDER: SchoolLevel[] = ["초등학교", "중학교", "고등학교"];
const LEVEL_BADGE: Record<SchoolLevel, string> = { "초등학교": "초", "중학교": "중", "고등학교": "고" };

function SchoolBentoCard({ schoolInfos }: { schoolInfos: SchoolInfoSummary[] }) {
  const byLevel = new Map(
    schoolInfos
      .filter((s) => s.schoolLevel !== null)
      .map((s) => [s.schoolLevel as SchoolLevel, s])
  );

  return (
    <div className="p-5 rounded-lg border border-gray-100 bg-white flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <School size={14} className="text-gray-400" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-gray-700">학군</span>
      </div>

      <div className="flex-1 space-y-0">
        {LEVEL_ORDER.map((level) => {
          const school = byLevel.get(level);
          const isLast = level === "고등학교";
          const borderClass = !isLast ? "border-b border-gray-50" : "";

          if (!school) {
            return (
              <div key={level} className={`flex items-center gap-3 py-3 ${borderClass}`}>
                <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-gray-300 flex items-center justify-center flex-shrink-0">
                  {LEVEL_BADGE[level]}
                </span>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full border border-dashed border-gray-200 w-3/4" />
                  <span className="text-[10px] text-gray-300 mt-1 block">수집 중</span>
                </div>
              </div>
            );
          }

          const mins = walkingMinutes(school.distance);
          const isChopuma = level === "초등학교" && !school.isEstimated && school.distance <= 600;

          return (
            <div key={level} className={`flex items-center gap-3 py-3 ${borderClass}`}>
              <span className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600 flex items-center justify-center flex-shrink-0">
                {LEVEL_BADGE[level]}
              </span>
              <div className="flex-1 min-w-0">

                <p className="text-sm font-semibold text-gray-800 truncate">
                  {school.schoolName}
                </p>

                <p className="text-sm font-semibold text-gray-800 truncate">{school.schoolName}</p>

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

      <p className="text-[10px] text-gray-300 mt-auto pt-3">출처: 학교알리미 (NEIS)</p>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function ComplexConditionBento({
  complexId,
  complexName,
  targetArea,
  selectedPyeong,
  schoolInfos,
  parkingCount,
  totalHouseholds,
  buildYear,
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
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={15} className="text-gray-600" strokeWidth={1.5} />
        <h2 className="text-sm font-bold text-gray-800">에듀 &amp; 리빙</h2>
      </div>

      <div className="space-y-4">
        {/* 학군 + 관리비 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SchoolBentoCard schoolInfos={schoolInfos} />
          {loading ? (
            <MaintenanceSkeleton />
          ) : (
            <MaintenanceCard data={resolvedData} selectedPyeong={selectedPyeong} />
          )}
        </div>

        {/* 종합 점수 카드 — 데이터 충분 시 재활성화 예정 */}
        {false && (
          <ScoreSection
            schoolInfos={schoolInfos}
            parkingCount={parkingCount}
            totalHouseholds={totalHouseholds}
            buildYear={buildYear}
            complexName={complexName}
          />
        )}
      </div>
    </div>
  );
}
