import type { SchoolInfoSummary } from "@/types/api";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface ComplexLivingBentoProps {
  // 주차
  parkingCountGround: number | null;
  parkingCountUnderground: number | null;
  totalHouseholds: number | null;
  // 시설 · 보안
  cctvCount: number | null;
  hasGym: boolean | null;
  hasLibrary: boolean | null;
  hasDaycare: boolean | null;
  hasSeniorCenter: boolean | null;
  hasPlayground: boolean | null;
  // 레이더 차트용 외부 입력
  maintenanceFeeAvg: number | null;   // 원 단위 월평균 예상 관리비
  nearestSchool: SchoolInfoSummary | null;
}

// ── 점수 정규화 (0~100) ────────────────────────────────────────────────────────
// 모든 함수: 데이터 없음 → 50 (중립) 반환

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// 낮은 관리비 = 높은 점수. 10만원 이하→100, 40만원 이상→10
function scoreEconomy(feeWon: number | null): number {
  if (feeWon === null) return 50;
  return clamp(Math.round(100 - ((feeWon - 100_000) / 300_000) * 90), 10, 100);
}

// 가까운 학교 = 높은 점수. 0m→100, 1500m+→10
function scoreEducation(distanceM: number | null): number {
  if (distanceM === null) return 50;
  return clamp(Math.round(100 - (distanceM / 1_500) * 90), 10, 100);
}

// 세대당 주차대수. 2.0+→100, 0.3 이하→10
function scoreParking(total: number | null, households: number | null): number {
  if (!total || !households) return 50;
  const ratio = total / households;
  return clamp(Math.round(((ratio - 0.3) / 1.7) * 90 + 10), 10, 100);
}

// 보유 시설 개수. 0/5→10, 5/5→100
function scoreAmenity(flags: (boolean | null)[]): number {
  const count = flags.filter(Boolean).length;
  return clamp(Math.round((count / flags.length) * 90 + 10), 10, 100);
}

// CCTV 세대당 비율. 0.5+→100, 0.05 이하→10
function scoreSafety(cctvCount: number | null, households: number | null): number {
  if (!cctvCount || !households) return 50;
  const ratio = cctvCount / households;
  return clamp(Math.round(((ratio - 0.05) / 0.45) * 90 + 10), 10, 100);
}

// ── SVG 레이더 차트 유틸 ────────────────────────────────────────────────────────
// viewBox 0 0 200 200, 중심 (100,100), 최대 반지름 70

const CX = 100, CY = 100, R = 70;

function polar(r: number, i: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function ringPoints(r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const { x, y } = polar(r, i);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function dataPoints(scores: number[]): string {
  return scores
    .map((s, i) => {
      const { x, y } = polar((s / 100) * R, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// 각 꼭짓점의 레이블 배치 정보
const AXES: { label: string; anchor: "middle" | "start" | "end"; dy: number }[] = [
  { label: "경제성",  anchor: "middle", dy: -6  }, // top
  { label: "교육",    anchor: "start",  dy:  0  }, // top-right
  { label: "주차",    anchor: "start",  dy:  4  }, // bottom-right
  { label: "편의",    anchor: "end",    dy:  4  }, // bottom-left
  { label: "안전",    anchor: "end",    dy:  0  }, // top-left
];

// ── 레이더 차트 컴포넌트 ──────────────────────────────────────────────────────

function BalanceRadarChart({ scores }: { scores: number[] }) {
  const LABEL_R = R * 1.3; // 레이블은 차트 바깥에 배치
  const rings = [R * 0.25, R * 0.5, R * 0.75, R];

  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      {/* 헤더 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">단지 밸런스</p>
        <p className="text-xs text-gray-400 mt-0.5">5개 지표 종합 점수</p>
      </div>

      <svg
        viewBox="0 0 200 200"
        className="w-full max-w-xs mx-auto"
        aria-label="단지 밸런스 레이더 차트"
        role="img"
      >
        {/* 배경 링 (4단계) */}
        {rings.map((r, idx) => (
          <polygon
            key={r}
            points={ringPoints(r)}
            fill={idx === rings.length - 1 ? "#F9FAFB" : "none"}
            stroke="#E5E7EB"
            strokeWidth="0.75"
          />
        ))}

        {/* 중심축 선 */}
        {Array.from({ length: 5 }, (_, i) => {
          const { x, y } = polar(R, i);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={x.toFixed(1)} y2={y.toFixed(1)}
              stroke="#F3F4F6"
              strokeWidth="0.75"
            />
          );
        })}

        {/* 데이터 폴리곤 */}
        <polygon
          points={dataPoints(scores)}
          fill="rgba(156,163,175,0.12)"
          stroke="#9CA3AF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 데이터 포인트 */}
        {scores.map((s, i) => {
          const { x, y } = polar((s / 100) * R, i);
          return (
            <circle
              key={i}
              cx={x.toFixed(1)}
              cy={y.toFixed(1)}
              r="2.5"
              fill="#9CA3AF"
            />
          );
        })}

        {/* 축 레이블 + 점수 */}
        {AXES.map(({ label, anchor, dy }, i) => {
          const { x, y } = polar(LABEL_R, i);
          return (
            <text
              key={i}
              x={x.toFixed(1)}
              y={(y + dy).toFixed(1)}
              textAnchor={anchor}
              fontSize="8.5"
              fill="#6B7280"
              fontWeight="500"
            >
              {label}
              <tspan
                x={x.toFixed(1)}
                dy="10"
                fontSize="7.5"
                fill="#9CA3AF"
                fontWeight="400"
              >
                {scores[i]}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── 주차 카드 ─────────────────────────────────────────────────────────────────

function ParkingCard({
  parkingCountGround,
  parkingCountUnderground,
  totalHouseholds,
}: Pick<ComplexLivingBentoProps, "parkingCountGround" | "parkingCountUnderground" | "totalHouseholds">) {
  const total =
    parkingCountGround !== null && parkingCountUnderground !== null
      ? parkingCountGround + parkingCountUnderground
      : null;

  const ratio =
    total !== null && totalHouseholds
      ? (total / totalHouseholds).toFixed(1)
      : null;

  const isCarFreeGround = parkingCountGround === 0;

  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      {/* 헤더 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">주차</p>
      </div>

      {/* 메인 수치 */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">세대당 주차대수</p>
        {ratio !== null ? (
          <p className="text-3xl font-bold tracking-tight text-gray-800">
            {ratio}
            <span className="text-base font-medium text-gray-500 ml-1">대</span>
          </p>
        ) : (
          <p className="text-2xl font-bold text-gray-300">—</p>
        )}
      </div>

      {/* 지상/지하 분리 */}
      {(parkingCountGround !== null || parkingCountUnderground !== null) && (
        <div className="pt-3 border-t border-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">지상</span>
            <span className="text-xs font-medium text-gray-600 tabular-nums">
              {parkingCountGround?.toLocaleString() ?? "—"}대
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">지하</span>
            <span className="text-xs font-medium text-gray-600 tabular-nums">
              {parkingCountUnderground?.toLocaleString() ?? "—"}대
            </span>
          </div>
        </div>
      )}

      {/* "지상에 차 없는 단지" 칩 — mint 계열 */}
      {isCarFreeGround && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium
            bg-emerald-50 text-emerald-700 border border-emerald-100
            rounded-full px-2.5 py-0.5">
            지상에 차 없는 단지
          </span>
        </div>
      )}
    </div>
  );
}

// ── 시설 · 보안 카드 ──────────────────────────────────────────────────────────

const FACILITY_LABELS: { key: keyof ComplexLivingBentoProps; label: string }[] = [
  { key: "hasGym",         label: "피트니스" },
  { key: "hasLibrary",     label: "작은도서관" },
  { key: "hasDaycare",     label: "어린이집" },
  { key: "hasSeniorCenter",label: "경로당" },
  { key: "hasPlayground",  label: "놀이터" },
];

function FacilityCard(props: Pick<
  ComplexLivingBentoProps,
  "cctvCount" | "totalHouseholds" |
  "hasGym" | "hasLibrary" | "hasDaycare" | "hasSeniorCenter" | "hasPlayground"
>) {
  const activeFacilities = FACILITY_LABELS.filter(({ key }) => props[key as keyof typeof props]);
  const cctvRatio =
    props.cctvCount !== null && props.totalHouseholds
      ? (props.cctvCount / props.totalHouseholds).toFixed(2)
      : null;

  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
      {/* 헤더 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">시설 · 보안</p>
      </div>

      {/* CCTV */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">보안 카메라</p>
        {props.cctvCount !== null ? (
          <div>
            <p className="text-3xl font-bold tracking-tight text-gray-800">
              {props.cctvCount.toLocaleString()}
              <span className="text-base font-medium text-gray-500 ml-1">대</span>
            </p>
            {cctvRatio && (
              <p className="text-xs text-gray-400 mt-0.5">
                세대당 {cctvRatio}대 수준
              </p>
            )}
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-300">—</p>
        )}
      </div>

      {/* 시설 칩 */}
      <div className="pt-3 border-t border-gray-50">
        {activeFacilities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activeFacilities.map(({ label }) => (
              <span
                key={label}
                className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-300">등록된 부대시설 없음</p>
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function ComplexLivingBento(props: ComplexLivingBentoProps) {
  const {
    parkingCountGround, parkingCountUnderground, totalHouseholds,
    cctvCount, hasGym, hasLibrary, hasDaycare, hasSeniorCenter, hasPlayground,
    maintenanceFeeAvg, nearestSchool,
  } = props;

  const totalParking =
    parkingCountGround !== null && parkingCountUnderground !== null
      ? parkingCountGround + parkingCountUnderground
      : null;

  const scores = [
    scoreEconomy(maintenanceFeeAvg),
    scoreEducation(nearestSchool?.distance ?? null),
    scoreParking(totalParking, totalHouseholds),
    scoreAmenity([hasGym, hasLibrary, hasDaycare, hasSeniorCenter, hasPlayground]),
    scoreSafety(cctvCount, totalHouseholds),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ParkingCard
        parkingCountGround={parkingCountGround}
        parkingCountUnderground={parkingCountUnderground}
        totalHouseholds={totalHouseholds}
      />
      <FacilityCard
        cctvCount={cctvCount}
        totalHouseholds={totalHouseholds}
        hasGym={hasGym}
        hasLibrary={hasLibrary}
        hasDaycare={hasDaycare}
        hasSeniorCenter={hasSeniorCenter}
        hasPlayground={hasPlayground}
      />
      <div className="md:col-span-2">
        <BalanceRadarChart scores={scores} />
      </div>
    </div>
  );
}
