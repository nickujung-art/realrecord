import { Car, Flame, LayoutGrid } from "lucide-react";
import type { MaintenanceFeeData } from "@/types/api";

// ── 관리비 포맷 헬퍼 ────────────────────────────────────────────────────────

/** 원 → "약 N만원" */
function fmtWon(won: number): string {
  const manwon = Math.round(won / 10000);
  if (manwon === 0) return "0원";
  return `약 ${manwon.toLocaleString("ko-KR")}만원`;
}

/** 원 → 만원 정수 (비교 바용) */
function toManwon(won: number): number {
  return Math.round(won / 10000);
}

// ── 계절 분류 ────────────────────────────────────────────────────────────────

type Season = "summer" | "winter" | "other";

function getSeason(ym: string): Season {
  const month = parseInt(ym.slice(4), 10);
  if (month >= 6 && month <= 8) return "summer";
  if (month === 12 || month <= 2) return "winter";
  return "other";
}

function avgFee(fees: MaintenanceFeeData[]): number {
  if (fees.length === 0) return 0;
  return Math.round(fees.reduce((s, f) => s + f.totalFeeWon, 0) / fees.length);
}

// ── 관리비 카드 ──────────────────────────────────────────────────────────────

interface MaintenanceFeeSectionProps {
  fees: MaintenanceFeeData[];
}

function SeasonBar({
  label,
  avgManwon,
  maxManwon,
  colorClass,
}: {
  label: string;
  avgManwon: number;
  maxManwon: number;
  colorClass: string;
}) {
  const pct = maxManwon > 0 ? Math.round((avgManwon / maxManwon) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-slate-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-xs font-semibold text-slate-700">
        {avgManwon > 0 ? `${avgManwon.toLocaleString()}만원` : "—"}
      </span>
    </div>
  );
}

export function MaintenanceFeeSection({ fees }: MaintenanceFeeSectionProps) {
  // 빈 상태
  if (fees.length === 0) {
    return (
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-900">💰 월평균 관리비</p>
        </div>
        <div className="flex flex-col items-center justify-center py-4 gap-1.5 text-center">
          <p className="text-sm text-slate-400">관리비 데이터를 준비 중입니다</p>
          <p className="text-xs text-slate-300">K-APT 연동 후 표시됩니다</p>
        </div>
      </div>
    );
  }

  const annualAvg = avgFee(fees);
  const summerFees = fees.filter((f) => getSeason(f.yearMonth) === "summer");
  const winterFees = fees.filter((f) => getSeason(f.yearMonth) === "winter");

  const annualManwon = toManwon(annualAvg);
  const summerManwon = summerFees.length > 0 ? toManwon(avgFee(summerFees)) : 0;
  const winterManwon = winterFees.length > 0 ? toManwon(avgFee(winterFees)) : 0;
  const maxManwon = Math.max(annualManwon, summerManwon, winterManwon, 1);

  // 최신 월 공용관리비 / 개별사용료 비율
  const latest = fees[0];
  const communalPct =
    latest.totalFeeWon > 0
      ? Math.round((latest.communalFeeWon / latest.totalFeeWon) * 100)
      : 0;

  return (
    <div className="card p-5">
      {/* 헤더 */}
      <div className="mb-1">
        <p className="text-sm font-bold text-slate-900">💰 월평균 관리비</p>
      </div>
      <p className="text-xs text-slate-400 mb-4">최근 {fees.length}개월 기준</p>

      {/* 메인 메시지 */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-slate-500 mb-0.5">이 아파트의 한 달 평균 관리비</p>
        <p className="text-xl font-bold text-slate-900">
          {fmtWon(annualAvg)}
          <span className="text-sm font-normal text-slate-400 ml-1">/ 월</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          공용관리비 {communalPct}% · 개별사용료 {100 - communalPct}%
        </p>
      </div>

      {/* 계절별 비교 바 */}
      <p className="text-xs font-semibold text-slate-500 mb-2.5">계절별 비교</p>
      <div className="space-y-2.5">
        <SeasonBar
          label="연평균"
          avgManwon={annualManwon}
          maxManwon={maxManwon}
          colorClass="bg-slate-400"
        />
        <SeasonBar
          label="🌞 하절기"
          avgManwon={summerManwon}
          maxManwon={maxManwon}
          colorClass="bg-amber-400"
        />
        <SeasonBar
          label="❄️ 동절기"
          avgManwon={winterManwon}
          maxManwon={maxManwon}
          colorClass="bg-blue-400"
        />
      </div>
    </div>
  );
}

// ── 시설 정보 카드 ────────────────────────────────────────────────────────────

interface FacilityInfoSectionProps {
  parkingCount: number | null;
  heatingMethod: string | null;
  hallwayType: string | null;
  totalHouseholds: number | null;
  hasGym: boolean | null;
  hasLibrary: boolean | null;
  hasDaycare: boolean | null;
  hasSeniorCenter: boolean | null;
  hasPlayground: boolean | null;
}

const FACILITY_LABELS = [
  { key: "hasGym" as const,         label: "피트니스" },
  { key: "hasLibrary" as const,     label: "작은도서관" },
  { key: "hasDaycare" as const,     label: "어린이집" },
  { key: "hasSeniorCenter" as const,label: "경로당" },
  { key: "hasPlayground" as const,  label: "놀이터" },
];

interface SpecItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function SpecTile({ item }: { item: SpecItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{item.label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
        {item.sub && <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>}
      </div>
    </div>
  );
}

export function FacilityInfoSection({
  parkingCount,
  heatingMethod,
  hallwayType,
  totalHouseholds,
  hasGym,
  hasLibrary,
  hasDaycare,
  hasSeniorCenter,
  hasPlayground,
}: FacilityInfoSectionProps) {
  const hasAnyData =
    parkingCount !== null ||
    heatingMethod !== null ||
    hallwayType !== null;

  const parkingRatio =
    parkingCount !== null && totalHouseholds !== null && totalHouseholds > 0
      ? (parkingCount / totalHouseholds).toFixed(1)
      : null;

  const facilityProps = { hasGym, hasLibrary, hasDaycare, hasSeniorCenter, hasPlayground };
  const activeFacilities = FACILITY_LABELS.filter(({ key }) => facilityProps[key]);

  const specs: SpecItem[] = [
    {
      icon: <Car size={16} className={parkingCount !== null ? "text-slate-600" : "text-slate-300"} />,
      label: "주차",
      value: parkingCount !== null ? `${parkingCount.toLocaleString()}대` : "정보 없음",
      sub: parkingRatio !== null ? `세대당 ${parkingRatio}대` : undefined,
    },
    {
      icon: <Flame size={16} className={heatingMethod !== null ? "text-orange-500" : "text-slate-300"} />,
      label: "난방방식",
      value: heatingMethod ?? "정보 없음",
    },
    {
      icon: <LayoutGrid size={16} className={hallwayType !== null ? "text-teal-500" : "text-slate-300"} />,
      label: "복도유형",
      value: hallwayType ?? "정보 없음",
    },
  ];

  return (
    <div className="card p-5">
      <div className="mb-1">
        <p className="text-sm font-bold text-slate-900">🏢 단지 시설 정보</p>
      </div>
      {totalHouseholds !== null && (
        <p className="text-xs text-slate-400 mb-1">
          총 {totalHouseholds.toLocaleString()}세대
        </p>
      )}

      {!hasAnyData ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1.5 text-center mt-2">
          <p className="text-sm text-slate-400">시설 정보를 준비 중입니다</p>
          <p className="text-xs text-slate-300">K-APT 연동 후 표시됩니다</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 mt-1">
          {specs.map((item) => (
            <SpecTile key={item.label} item={item} />
          ))}
        </div>
      )}

      {/* 부대시설 칩 */}
      <div className="pt-3 border-t border-slate-50 mt-2">
        {activeFacilities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activeFacilities.map(({ label }) => (
              <span
                key={label}
                className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-300">등록된 부대시설 없음</p>
        )}
      </div>
    </div>
  );
}
