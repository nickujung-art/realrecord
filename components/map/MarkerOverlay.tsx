"use client";

import Link from "next/link";
import { formatMapPrice } from "@/lib/utils/formatPrice";
import type { BoundsComplexItem } from "@/types/api";

// ── 상수 ──────────────────────────────────────────────────────────
const TREND_HOT_THRESHOLD = 50;    // trendScore 이상 → 🔥 뱃지
const ELITE_SCORE_THRESHOLD = 100; // Level 1-4에서 점 대신 풀 마커 기준

// ── 줌 레벨 → 존 변환 ────────────────────────────────────────────
export type ZoneLevel = "wide" | "mid" | "detail";

export function getZoneLevel(zoomLevel: number): ZoneLevel {
  if (zoomLevel >= 8) return "wide";
  if (zoomLevel >= 5) return "mid";
  return "detail";
}

// ── 뱃지 서브 컴포넌트 ────────────────────────────────────────────

/** 👑 최근 7일 신고가 */
function CrownIcon() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-label="신고가">
      <path
        d="M1.5 10h10"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 10L1 4.5l3 2.5L6.5 1 10 7l3-2.5L12 10"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** ⚠️ 최근 7일 취소 감지 */
function CancelBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full
        bg-orange-50 border border-orange-200 text-orange-500
        text-[9px] font-black leading-none"
      aria-label="취소 거래 감지"
    >
      !
    </span>
  );
}

/** 💬 리뷰 있음 */
function ReviewBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="리뷰 있음">
      <path
        d="M1.5 1.5A.5.5 0 012 1h8a.5.5 0 01.5.5v6A.5.5 0 0110 8H5L1.5 11V8H2a.5.5 0 01-.5-.5v-6z"
        fill="#94a3b8"
      />
    </svg>
  );
}

/** 마커 하단 삼각 포인터 */
function ArrowDown({ highlight }: { highlight: boolean }) {
  return (
    <svg
      width="12"
      height="6"
      viewBox="0 0 12 6"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", marginTop: "-1px" }}
    >
      <polygon
        points="0,0 12,0 6,6"
        fill="white"
      />
      <polyline
        points="0,0 6,6 12,0"
        fill="none"
        stroke={highlight ? "#fde68a" : "#f1f5f9"}
        strokeWidth="1"
      />
    </svg>
  );
}

// ── Dot 마커 (우선순위 낮은 일반 단지) ───────────────────────────

function DotMarker({ name }: { name: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full bg-primary-600/40 border-2 border-primary-600/20
        hover:bg-primary-600/70 transition-colors duration-100 cursor-pointer"
      title={name}
    />
  );
}

// ── 광역 마커 (Level 8~14) ────────────────────────────────────────
// 단지명 + 대표 뱃지만 노출. 가격 생략.

function WideMarker({ complex }: { complex: BoundsComplexItem }) {
  const isHot = complex.trendScore >= TREND_HOT_THRESHOLD;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          flex items-center gap-1 bg-white rounded-full px-2.5 py-1
          shadow-[0_2px_6px_0_rgb(0_0_0/0.10)] border
          ${complex.isRecordHigh ? "border-amber-200" : "border-gray-100"}
        `}
      >
        {complex.isRecordHigh && <CrownIcon />}
        {isHot && (
          <span className="text-[11px] leading-none" aria-label="트렌드">🔥</span>
        )}
        <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap max-w-[100px] truncate">
          {complex.name}
        </span>
      </div>
      <ArrowDown highlight={complex.isRecordHigh} />
    </div>
  );
}

// ── 풀 마커 (Level 5~7, Detail 정예 단지) ────────────────────────
// 가격 중심 노출 + 모든 뱃지 활성화.

function FullMarker({ complex }: { complex: BoundsComplexItem }) {
  const isHot = complex.trendScore >= TREND_HOT_THRESHOLD;
  const hasTopBadges = complex.isRecordHigh || isHot;
  const hasPrice = complex.representativePrice !== null;

  return (
    <div className="flex flex-col items-center">
      {/* 상단 뱃지 행: 왕관·불꽃 */}
      {hasTopBadges && (
        <div className="flex items-center gap-1 mb-0.5">
          {complex.isRecordHigh && <CrownIcon />}
          {isHot && (
            <span className="text-[11px] leading-none" aria-label="트렌드">🔥</span>
          )}
        </div>
      )}

      {/* 메인 카드 */}
      <div
        className={`
          flex items-center gap-1.5
          bg-white rounded-xl border px-3 py-1.5
          shadow-[0_3px_10px_0_rgb(0_0_0/0.12)]
          hover:shadow-[0_4px_16px_0_rgb(0_0_0/0.18)]
          transition-shadow duration-100
          ${complex.isRecordHigh ? "border-amber-200" : "border-gray-100"}
          ${complex.hasRecentCancellation ? "border-orange-200" : ""}
        `}
      >
        {/* 가격 (없으면 단지명으로 폴백) */}
        {hasPrice ? (
          <span className="text-sm font-bold text-price text-gray-900 whitespace-nowrap">
            {formatMapPrice(complex.representativePrice!)}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap max-w-[90px] truncate">
            {complex.name}
          </span>
        )}

        {/* 우측 인라인 뱃지: 취소·리뷰 */}
        {(complex.hasRecentCancellation || complex.reviewCount > 0) && (
          <span className="flex items-center gap-0.5">
            {complex.hasRecentCancellation && <CancelBadge />}
            {complex.reviewCount > 0 && <ReviewBadge />}
          </span>
        )}
      </div>

      <ArrowDown highlight={complex.isRecordHigh} />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────

interface MarkerOverlayProps {
  complex: BoundsComplexItem;
  zoomLevel: number;
  /**
   * 마커 클릭 시 호출할 콜백.
   * - 제공되면 → BottomSheet 열기 (클릭 이벤트 가로챔, Link 미사용)
   * - 미제공이면 → 기존처럼 Link로 상세페이지 직접 이동
   */
  onSelect?: () => void;
}

export function MarkerOverlay({ complex, zoomLevel, onSelect }: MarkerOverlayProps) {
  const zone = getZoneLevel(zoomLevel);

  // Level 1-4 상세: 우선순위 낮은 단지 → Dot (onSelect 연결)
  if (zone === "detail" && complex.mapPriorityScore < ELITE_SCORE_THRESHOLD) {
    return onSelect ? (
      <div onClick={onSelect} style={{ pointerEvents: "auto", cursor: "pointer" }}>
        <DotMarker name={complex.name} />
      </div>
    ) : (
      <DotMarker name={complex.name} />
    );
  }

  // onSelect가 있으면 div+onClick, 없으면 Link로 직접 이동
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    onSelect ? (
      <div onClick={onSelect} style={{ pointerEvents: "auto", cursor: "pointer" }}>
        {children}
      </div>
    ) : (
      <Link href={`/apartments/${complex.id}`} style={{ pointerEvents: "auto" }}>
        {children}
      </Link>
    );

  // Level 8-14 광역: 이름 + 대표 뱃지만
  if (zone === "wide") {
    return (
      <Wrapper>
        <WideMarker complex={complex} />
      </Wrapper>
    );
  }

  // Level 5-7 동 단위 / Level 1-4 정예: 가격 + 전체 뱃지
  return (
    <Wrapper>
      <FullMarker complex={complex} />
    </Wrapper>
  );
}
