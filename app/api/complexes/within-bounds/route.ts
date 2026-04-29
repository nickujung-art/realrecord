import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { BoundsComplexItem, BoundsResponse } from "@/types/api";

// ── 상수 ──────────────────────────────────────────────────────────

/** isRecordHigh 판정 기준: 7일 */
const RECORD_HIGH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Kakao Map 줌 레벨(1~14)에 따른 마커 상한.
 * 숫자가 낮을수록 확대된 상태(블록/단지 단위).
 *
 * Level 8~14 → 시/도 광역  → 정예 15개 (왕관·광고 단지만 노출)
 * Level 5~7  → 구/동 단위  → 우선순위 50개 (가격 + 뱃지 풀 노출)
 * Level 1~4  → 블록/단지   → 100개 (일반 단지 포함 상세 노출)
 */
function resolveLimit(zoomLevel: number): number {
  if (zoomLevel >= 8) return 15;
  if (zoomLevel >= 5) return 50;
  return 100;
}

// ── Route Handler ─────────────────────────────────────────────────

/**
 * GET /api/complexes/within-bounds
 *
 * 쿼리 파라미터:
 *   swLat, swLng   — 남서쪽 모서리 좌표
 *   neLat, neLng   — 북동쪽 모서리 좌표
 *   zoomLevel      — Kakao Map 줌 레벨 (1~14, 기본값 5)
 *
 * 동작:
 *   1. bounds 안에서 좌표가 있는 단지만 대상으로 함
 *   2. mapPriorityScore DESC 정렬로 정예 단지 우선 선택
 *   3. zoomLevel에 따라 LIMIT 적용 (15 / 50 / 100)
 *   4. isRecordHigh를 서버에서 계산하여 응답에 포함
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // ── 파라미터 파싱 ────────────────────────────────────────────────

  const swLat = parseFloat(searchParams.get("swLat") ?? "");
  const swLng = parseFloat(searchParams.get("swLng") ?? "");
  const neLat = parseFloat(searchParams.get("neLat") ?? "");
  const neLng = parseFloat(searchParams.get("neLng") ?? "");
  const rawZoom = parseInt(searchParams.get("zoomLevel") ?? "5", 10);

  // 필수 bounds 검증
  if ([swLat, swLng, neLat, neLng].some(isNaN)) {
    return NextResponse.json(
      { error: "swLat, swLng, neLat, neLng는 모두 필수 숫자 파라미터입니다." },
      { status: 400 }
    );
  }

  // 줌 레벨 안전 범위 보정 (NaN, 범위 초과 방어)
  const zoomLevel = isNaN(rawZoom) ? 5 : Math.min(14, Math.max(1, rawZoom));
  const limit = resolveLimit(zoomLevel);

  // ── DB 쿼리 ──────────────────────────────────────────────────────

  try {
    const rows = await prisma.apartmentComplex.findMany({
      where: {
        // bounds 필터 — Float? 컬럼에 범위 조건을 걸면 null은 자동 제외됨
        latitude:  { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
      },
      // 핵심: mapPriorityScore 내림차순 + LIMIT → 정예 단지만 추출
      orderBy: { mapPriorityScore: "desc" },
      take: limit,
      // 마커 렌더링에 필요한 최소 필드만 SELECT (payload 최소화)
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        mapPriorityScore: true,
        representativePrice: true,
        representativeArea: true,
        hasRecentCancellation: true,
        recentRecordHighAt: true,   // isRecordHigh 계산 후 응답에서 제외
        trendScore: true,
        reviewCount: true,
      },
    });

    // ── 응답 데이터 가공 ────────────────────────────────────────────

    const now = Date.now();

    const complexes: BoundsComplexItem[] = rows.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.latitude as number,
      lng: c.longitude as number,
      mapPriorityScore: c.mapPriorityScore,
      representativePrice: c.representativePrice,
      representativeArea: c.representativeArea,
      hasRecentCancellation: c.hasRecentCancellation,
      // recentRecordHighAt을 직접 노출하지 않고 Boolean으로 변환
      // → 프론트가 날짜 계산 없이 뱃지 여부만 판단 가능
      isRecordHigh:
        c.recentRecordHighAt !== null &&
        now - c.recentRecordHighAt.getTime() <= RECORD_HIGH_WINDOW_MS,
      trendScore: c.trendScore,
      reviewCount: c.reviewCount,
    }));

    const body: BoundsResponse = {
      complexes,
      meta: {
        zoomLevel,
        limit,
        returned: complexes.length,
      },
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ within-bounds API 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
