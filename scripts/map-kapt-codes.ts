import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.PUBLIC_DATA_API_KEY ?? "";
const KAPT_BASE = "https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3";

const CITY_CODE_MAP: Record<string, string[]> = {
  "창원시": ["48121", "48123", "48125", "48127", "48129"],
  "김해시": ["48330"],
};

interface KaptItem {
  kaptCode: string;
  kaptName: string;
}

// ── 문자열 비교 유틸리티 ──────────────────────────────────────────────────────
function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
function normalize(s: string) { return s.replace(/\s+/g, "").replace(/아파트$/, "").toLowerCase(); }
function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.88;
  return 0;
}

// ── API 호출 (페이지당 999개로 제한 해제) ────────────────────────────────────
async function fetchKaptPage(sigunguCode: string, pageNo: number): Promise<KaptItem[]> {
  // 💡 numOfRows를 999로 늘려서 김해시 데이터가 잘리지 않게 합니다.
  const url = `${KAPT_BASE}?serviceKey=${API_KEY}&sigunguCode=${sigunguCode}&pageNo=${pageNo}&numOfRows=999&_type=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`API 응답 오류`);
  }

  const items = json?.response?.body?.items ?? [];
  return Array.isArray(items) ? items : [items];
}

// ── 메인 로직 ─────────────────────────────────────────────────────────────────
async function main() {
  const { prisma } = await import("../lib/db.js");

  if (!API_KEY) {
    console.error("\n❌ PUBLIC_DATA_API_KEY가 없습니다.\n");
    process.exit(1);
  }

  console.log("\n📡 1단계: 국토교통부 API 단지 데이터 수집 중...");

  // 모든 단지를 하나의 배열로 모읍니다.
  let allKaptItems: KaptItem[] = [];

  for (const cityName of Object.keys(CITY_CODE_MAP)) {
    const codes = CITY_CODE_MAP[cityName];
    for (const code of codes) {
      try {
        process.stdout.write(`  └ ${cityName} (${code}) 조회 중... `);
        const items = await fetchKaptPage(code, 1);
        allKaptItems.push(...items);
        console.log(`${items.length}개 발견`);
      } catch (err: any) {
        console.log(`❌ 실패: ${err.message}`);
      }
      await delay(500);
    }
  }

  console.log(`\n✅ 총 ${allKaptItems.length}개의 K-APT 단지 확보 완료!`);
  console.log("\n🔗 2단계: 우리 DB 아파트와 K-APT 코드 매핑 시작...");

  // DB에서 kaptCode가 없는 아파트만 불러옵니다.
  const dbComplexes = await prisma.apartmentComplex.findMany({
    where: { kaptCode: null },
  });

  let mappedCount = 0;

  for (const dbCx of dbComplexes) {
    let bestMatch: KaptItem | null = null;
    let bestScore = 0;

    for (const kapt of allKaptItems) {
      const score = nameSimilarity(dbCx.name, kapt.kaptName);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = kapt;
      }
    }

    // 유사도가 높으면 DB에 kaptCode를 업데이트 (매핑 성공)
    if (bestMatch && bestScore > 0.8) {
      await prisma.apartmentComplex.update({
        where: { id: dbCx.id },
        data: { kaptCode: bestMatch.kaptCode },
      });
      console.log(`  [매핑성공] ${dbCx.name} ➡️ ${bestMatch.kaptName} (${bestMatch.kaptCode})`);
      mappedCount++;
    } else {
      console.log(`  [매핑실패] ${dbCx.name} (유사한 단지 없음)`);
    }
  }

  console.log(`\n🎉 매핑 완료: 총 ${mappedCount}개 단지 업데이트 됨!`);
}

main().finally(() => prisma.$disconnect());