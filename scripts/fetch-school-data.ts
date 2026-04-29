/**
 * 학교알리미(NEIS) 공공데이터 API 연동 스크립트
 *
 * 사용법: npx tsx scripts/fetch-school-data.ts [--dry-run]
 *
 * 필요 환경변수 (.env.local):
 *   NEIS_API_KEY      - 공공데이터포털 인증키 (https://open.neis.go.kr)
 *   KAKAO_REST_API_KEY - 카카오 REST API 키 (주소 → 좌표 변환용, 선택)
 *
 * 동작 방식:
 *   1. DB에서 모든 ApartmentComplex 조회
 *   2. NEIS API에서 경상남도 초등학교 목록 수집
 *   3. 단지별로 가장 가까운 학교 최대 2개를 탐색
 *      - 단지에 lat/lon 있음 + KAKAO_REST_API_KEY 있음: 학교 주소 지오코딩 → Haversine 실거리
 *      - 그 외: 시/구 주소 매칭 → 추정 거리 사용
 *   4. SchoolInfo 테이블에 upsert
 */

import { loadEnvConfig } from "@next/env";
import { prisma } from "../lib/db";

loadEnvConfig(process.cwd());

const NEIS_API_KEY = process.env.NEIS_API_KEY ?? "";
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");
const DELAY_MS = 1000;
const MAX_RADIUS_M = 1500;

// ── Types ─────────────────────────────────────────────────────────────────────

interface NeisSchool {
  SD_SCHUL_CODE: string;     // 학교 코드
  ATPT_OFCDC_SC_CODE: string; // 교육청 코드
  SCHUL_NM: string;          // 학교명
  FOND_SC_NM: string;        // 공립/사립/국립
  ORG_RDNMA: string;         // 도로명 주소
  HMPG_ADRES: string;        // 홈페이지 주소
  JU_ORG_NM: string;         // 관할 조직명 (예: 창원시성산구)
}

interface GeoCoord {
  lat: number;
  lon: number;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Haversine 공식으로 두 좌표 사이 직선거리(미터) 계산 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** distance(m) → "상" | "중" | "하" */
function distanceToGrade(m: number): string {
  if (m <= 400) return "상";
  if (m <= 800) return "중";
  return "하";
}

/** 학교알리미 직접 링크 (없으면 홈페이지로 fallback) */
function buildSchoolUrl(school: NeisSchool): string | null {
  if (school.ATPT_OFCDC_SC_CODE && school.SD_SCHUL_CODE) {
    return (
      `https://www.schoolinfo.go.kr/ei/ss/Pneiss_a01_s0.do` +
      `?SEARCH_SCHUL_CODE=${school.SD_SCHUL_CODE}` +
      `&ATPT_OFCDC_SC_CODE=${school.ATPT_OFCDC_SC_CODE}`
    );
  }
  return school.HMPG_ADRES || null;
}

// ── NEIS API ──────────────────────────────────────────────────────────────────

/**
 * 경상남도 초등학교 전체 목록을 NEIS에서 가져옵니다.
 * 1000개 단위로 페이지네이션합니다.
 */
async function fetchNeisSchools(): Promise<NeisSchool[]> {
  if (!NEIS_API_KEY) {
    throw new Error(
      "NEIS_API_KEY 환경변수가 설정되지 않았습니다.\n" +
      "  https://open.neis.go.kr 에서 인증키를 발급받아 .env.local에 추가하세요.",
    );
  }

  const results: NeisSchool[] = [];
  let page = 1;
  const pageSize = 1000;

  while (true) {
    const params = new URLSearchParams({
      KEY: NEIS_API_KEY,
      Type: "json",
      pIndex: String(page),
      pSize: String(pageSize),
      SCHUL_KND_SC_NM: "초등학교",
      LCTN_SC_NM: "경상남도",
    });

    const url = `https://open.neis.go.kr/hub/schoolInfo?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NEIS API 오류: HTTP ${res.status}`);

    const json = await res.json();

    // NEIS API 에러 응답 체크
    const result = json?.schoolInfo?.[0]?.head?.[1]?.RESULT;
    if (result?.CODE && result.CODE !== "INFO-000") {
      // INFO-200 = 데이터 없음 (마지막 페이지)
      if (result.CODE === "INFO-200") break;
      throw new Error(`NEIS API 오류: ${result.CODE} ${result.MESSAGE}`);
    }

    const rows: NeisSchool[] = json?.schoolInfo?.[1]?.row ?? [];
    if (rows.length === 0) break;

    results.push(...rows);
    if (rows.length < pageSize) break;
    page++;
  }

  return results;
}

// ── Kakao Geocoding ───────────────────────────────────────────────────────────

const _geocodeCache = new Map<string, GeoCoord | null>();

async function geocodeAddress(address: string): Promise<GeoCoord | null> {
  if (!KAKAO_KEY) return null;

  if (_geocodeCache.has(address)) return _geocodeCache.get(address)!;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) {
      _geocodeCache.set(address, null);
      return null;
    }
    const json = await res.json();
    const doc = json.documents?.[0];
    if (!doc) {
      _geocodeCache.set(address, null);
      return null;
    }
    const coord = { lat: parseFloat(doc.y), lon: parseFloat(doc.x) };
    _geocodeCache.set(address, coord);
    return coord;
  } catch {
    _geocodeCache.set(address, null);
    return null;
  }
}

// ── Matching ──────────────────────────────────────────────────────────────────

/**
 * 단지의 city/district 기준으로 같은 관할 지역 학교를 필터링합니다.
 * NEIS `JU_ORG_NM` 예시: "창원시성산구", "창원시의창구", "김해시"
 */
function filterLocalSchools(
  schools: NeisSchool[],
  city: string,
  district: string,
): NeisSchool[] {
  // 시 이름에서 "시" 앞 글자만 매칭 (예: "창원시" → "창원")
  const cityKey = city.replace(/시$/, "");
  const distKey = district.replace(/[구군]$/, "");

  return schools.filter((s) => {
    const org = s.JU_ORG_NM ?? "";
    const addr = s.ORG_RDNMA ?? "";
    return (
      (org.includes(cityKey) || addr.includes(cityKey)) &&
      (org.includes(distKey) || addr.includes(distKey))
    );
  });
}

interface SchoolWithDistance {
  school: NeisSchool;
  distance: number;
  isEstimated: boolean;
}

/**
 * 단지 기준으로 거리순 학교 목록을 반환합니다.
 *
 * - 단지 좌표 있음 + KAKAO_KEY 있음: Haversine 실거리 (isEstimated=false)
 * - 좌표 없음: 도로명 주소의 동(洞) 이름이 일치하는 학교만 포함 (isEstimated=true)
 *   → 구(區) 전체 매칭(900m 일괄 부여)은 신뢰도가 너무 낮아 제거함.
 *     좌표 미등록 단지에서 엉뚱한 학교가 고정 노출되는 버그의 원인이었음.
 */
async function findNearbySchools(
  lat: number | null,
  lon: number | null,
  dong: string,
  localSchools: NeisSchool[],
): Promise<SchoolWithDistance[]> {
  const results: SchoolWithDistance[] = [];

  for (const school of localSchools) {
    if (lat !== null && lon !== null && KAKAO_KEY) {
      // ── 경로 A: 지오코딩 실거리 ─────────────────────────────────────
      const coord = await geocodeAddress(school.ORG_RDNMA);
      await delay(100); // Kakao 지오코딩 rate limit
      if (!coord) continue;
      const distance = haversine(lat, lon, coord.lat, coord.lon);
      if (distance > MAX_RADIUS_M) continue;
      results.push({ school, distance, isEstimated: false });
    } else {
      // ── 경로 B: 좌표 없음 — 동(洞) 이름 일치 학교만 저장 ────────────
      // 구(區) 전체에 900m를 일괄 부여하면 NEIS 응답 순서대로 엉뚱한 학교가
      // 고정 노출되므로, 동 이름이 도로명 주소에 포함된 학교만 허용한다.
      const addr = school.ORG_RDNMA ?? "";
      const dongKey = dong.replace(/[0-9]/g, "").replace(/동$/, "");
      if (!addr.includes(dongKey)) continue; // 동 불일치 → 제외
      results.push({ school, distance: 500, isEstimated: true }); // 500m: 동 내 추정 중간값
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  리얼레코드 | 학교알리미 데이터 수집");
  if (DRY_RUN) console.log("  ⚠️  DRY-RUN 모드 — DB 업데이트 없음");
  if (!KAKAO_KEY) console.log("  ℹ️  KAKAO_REST_API_KEY 없음 — 주소 기반 추정 거리 사용");
  console.log("═══════════════════════════════════════════════════\n");

  // 1. DB 단지 목록
  const complexes = await prisma.apartmentComplex.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      dong: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: "asc" },
  });
  console.log(`📋 대상 단지: ${complexes.length}개`);

  // 2. NEIS에서 경상남도 초등학교 전체 수집 (한 번만)
  process.stdout.write("📡 NEIS에서 초등학교 목록 수집 중 ... ");
  const allSchools = await fetchNeisSchools();
  console.log(`${allSchools.length}개 완료\n`);

  let inserted = 0, updated = 0, skipped = 0;

  // 3. 단지별 루프
  for (let i = 0; i < complexes.length; i++) {
    const cx = complexes[i];
    const idx = `[${String(i + 1).padStart(3, " ")}/${complexes.length}]`;

    process.stdout.write(`${idx} ${cx.name} (${cx.district}) ... `);

    // 3-1. 관할 학교 필터
    const localSchools = filterLocalSchools(allSchools, cx.city, cx.district);

    if (localSchools.length === 0) {
      console.log("⚠️  관할 학교 없음 (NEIS 매칭 실패)");
      skipped++;
      await delay(DELAY_MS);
      continue;
    }

    // 3-2. 거리 계산 및 정렬
    const ranked = await findNearbySchools(
      cx.latitude,
      cx.longitude,
      cx.dong,
      localSchools,
    );

    if (ranked.length === 0) {
      console.log(`⚠️  반경 ${MAX_RADIUS_M}m 내 학교 없음`);
      skipped++;
      await delay(DELAY_MS);
      continue;
    }

    // 3-3. 상위 2개만 upsert
    const top2 = ranked.slice(0, 2);
    const names = top2.map((r) => `${r.school.SCHUL_NM}${r.isEstimated ? "(추정)" : ""}`).join(", ");
    console.log(`✅ ${names}`);

    if (!DRY_RUN) {
      for (const { school, distance, isEstimated } of top2) {
        const grade = distanceToGrade(distance);
        const existing = await prisma.schoolInfo.findUnique({
          where: { complexId_schoolName: { complexId: cx.id, schoolName: school.SCHUL_NM } },
          select: { id: true },
        });

        await prisma.schoolInfo.upsert({
          where: { complexId_schoolName: { complexId: cx.id, schoolName: school.SCHUL_NM } },
          create: {
            complexId: cx.id,
            schoolName: school.SCHUL_NM,
            schoolType: school.FOND_SC_NM || "공립",
            address: school.ORG_RDNMA || null,
            distance,
            grade,
            schoolUrl: buildSchoolUrl(school),
            isEstimated,
          },
          update: {
            schoolType: school.FOND_SC_NM || "공립",
            address: school.ORG_RDNMA || null,
            distance,
            grade,
            schoolUrl: buildSchoolUrl(school),
            isEstimated,
          },
        });

        existing ? updated++ : inserted++;
      }
    }

    await delay(DELAY_MS);
  }

  // 4. 요약
  console.log("\n───────────────────────────────────────────────────");
  console.log("  수집 결과 요약");
  console.log("───────────────────────────────────────────────────");
  if (!DRY_RUN) {
    console.log(`  ✅ 신규 저장   ${String(inserted).padStart(4, " ")}건`);
    console.log(`  🔄 갱신        ${String(updated).padStart(4, " ")}건`);
  }
  console.log(`  ⚠️  매칭 실패   ${String(skipped).padStart(4, " ")}개 단지`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("\n[FATAL]", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
