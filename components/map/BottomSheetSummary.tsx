"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMapPrice, formatManwonShort } from "@/lib/utils/formatPrice";
import type { BoundsComplexItem, ComplexSummary, SummaryTransaction } from "@/types/api";

// ── 슬라이드 애니메이션 지속 시간 (ms) ───────────────────────────
const ANIM_MS = 300;

// ── 스파크라인 컴포넌트 ───────────────────────────────────────────
/**
 * 경량 SVG 스파크라인.
 * - 무거운 차트 라이브러리 없이 순수 SVG만 사용
 * - viewBox 기준 가상 좌표계로 정규화: toX는 인덱스 → 가로 비율, toY는 가격 → 세로 비율
 * - 최저가~최고가를 H 범위에 선형 매핑. 모든 값이 같으면 range=1로 fallback
 * - 그라데이션 fill은 <linearGradient> id를 complexId 기반으로 고정해 hydration 안전 보장
 */
function Sparkline({
  data,
  complexId,
}: {
  data: SummaryTransaction[];
  complexId: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-12 text-xs text-gray-300">
        거래 데이터 없음
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex items-center justify-center h-12 text-sm font-semibold text-gray-500">
        {formatManwonShort(data[0].priceManwon)}
      </div>
    );
  }

  // SVG 가상 캔버스 크기 및 패딩
  const W = 280, H = 48, PX = 8, PY = 6;
  const n = data.length;

  const prices = data.map((d) => d.priceManwon);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1; // 모든 값 동일 시 range=1 fallback

  // 인덱스 → SVG x 좌표 (등간격)
  const toX = (i: number) => PX + (i / (n - 1)) * (W - PX * 2);
  // 가격 → SVG y 좌표 (높은 가격 = 낮은 y = 그래프 위쪽)
  const toY = (p: number) => PY + (1 - (p - minP) / range) * (H - PY * 2);

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.priceManwon) }));
  const polylineStr = pts.map((p) => `${p.x},${p.y}`).join(" ");

  // 면적 채우기 경로: 선을 따라가다 → 우하 → 좌하 → 시작점
  const areaPath = [
    `M ${pts[0].x},${pts[0].y}`,
    ...pts.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${pts[n - 1].x},${H - PY}`,
    `L ${pts[0].x},${H - PY}`,
    "Z",
  ].join(" ");

  // 최신(우측) 가격이 최초(좌측)보다 높으면 상승 색상
  const isRising = prices[n - 1] >= prices[0];
  const color = isRising ? "#16a34a" : "#dc2626"; // positive-600 / negative-600
  const gradId = `spark-${complexId}`; // complexId로 고정 → hydration 안전

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 면적 그라데이션 */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* 추이 선 */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 데이터 포인트 점 */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill="white"
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// ── 스켈레톤 ─────────────────────────────────────────────────────
function SheetSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-5 pt-5 pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-5 w-36 bg-gray-100 rounded" />
          <div className="h-3.5 w-20 bg-gray-100 rounded" />
        </div>
        <div className="h-7 w-20 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-12 bg-gray-50 rounded-lg" />
      <div className="h-3.5 w-48 bg-gray-100 rounded" />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
interface BottomSheetSummaryProps {
  complexId: string;
  /** 마커에서 이미 가진 기본 정보 — 로딩 중 즉시 표시용 */
  initialData: Pick<BoundsComplexItem, "name" | "representativePrice" | "representativeArea">;
  onClose: () => void;
}

export function BottomSheetSummary({
  complexId,
  initialData,
  onClose,
}: BottomSheetSummaryProps) {
  const router = useRouter();

  // ── 슬라이드 업 애니메이션 ──────────────────────────────────────
  // 마운트 직후 visible=false → rAF 1틱 후 true로 전환 → CSS transition 트리거
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 닫기: 먼저 애니메이션 → ANIM_MS 후 onClose 호출
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, ANIM_MS);
  }, [onClose]);

  // 상세페이지 이동
  const handleNavigate = useCallback(() => {
    router.push(`/apartments/${complexId}`);
  }, [router, complexId]);

  // ── 단건 요약 API 호출 ──────────────────────────────────────────
  const [summary, setSummary] = useState<ComplexSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary(null);

    fetch(`/api/complexes/${complexId}/summary`)
      .then((r) => (r.ok ? (r.json() as Promise<ComplexSummary>) : Promise.reject()))
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { /* 실패 시 initialData만 표시 */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [complexId]);

  // 표시에 사용할 데이터 (API 로드 전에는 initialData 사용)
  const name = summary?.name ?? initialData.name;
  const price = summary?.representativePrice ?? initialData.representativePrice;
  const area = summary?.representativeArea ?? initialData.representativeArea;

  // ── 렌더링 ────────────────────────────────────────────────────
  return (
    // 전체 오버레이
    <div className="fixed inset-0 z-[200]">
      {/* 반투명 백드롭 — 클릭 시 닫기 */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet 패널 */}
      <div
        className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto
          bg-white rounded-t-2xl shadow-[0_-4px_24px_0_rgb(0_0_0/0.12)]
          transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* 드래그 핸들 (UI 힌트) */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center
            rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200
            transition-colors duration-100 text-sm font-bold z-10"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 콘텐츠 — 전체 클릭 시 상세페이지 이동 */}
        {loading && !summary ? (
          <SheetSkeleton />
        ) : (
          <div
            onClick={handleNavigate}
            className="px-5 pt-4 pb-2 cursor-pointer select-none group"
          >
            {/* 헤더: 단지명 + 가격 */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 leading-snug break-keep">
                  {name}
                </h3>
                {summary?.dong && (
                  <p className="text-xs text-gray-500 mt-0.5">{summary.dong}</p>
                )}
              </div>
              {price && (
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-price text-gray-900 leading-none">
                    {formatMapPrice(price)}
                  </div>
                  {area && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{area}</div>
                  )}
                </div>
              )}
            </div>

            {/* 스파크라인 영역 */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  최근 실거래 추이
                </span>
                {summary && summary.recentTransactions.length > 0 && (
                  <span className="text-[10px] text-gray-300">
                    {summary.recentTransactions.length}건
                  </span>
                )}
              </div>
              <Sparkline
                data={summary?.recentTransactions ?? []}
                complexId={complexId}
              />
            </div>

            {/* 최신 리뷰 스니펫 */}
            {summary?.latestReview && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  <span className="mr-1">💬</span>
                  {summary.latestReview.content}
                </p>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  — {summary.latestReview.authorName}
                </p>
              </div>
            )}

            {/* CTA 힌트 */}
            <div className="flex items-center justify-end mt-3 pt-2.5 border-t border-gray-50">
              <span className="text-[11px] font-semibold text-primary-600 group-hover:text-primary-700 transition-colors">
                상세 정보 보기 →
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
