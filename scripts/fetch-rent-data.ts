/**
 * MOLIT 전월세 실거래 수집 스크립트
 *
 * 사용법:
 *   npx tsx scripts/fetch-rent-data.ts              # 최근 12개월 전체
 *   npx tsx scripts/fetch-rent-data.ts 2025 4       # 특정 연월 단건
 *   npx tsx scripts/fetch-rent-data.ts --dry-run    # DB 저장 없이 수량 확인
 *
 * - MOLIT RTMSDataSvcAptRent API 호출 (전세 계약만 필터링)
 * - DB 기존 ApartmentComplex와 이름+동 매칭 → RentRecord upsert
 * - 매칭 실패 항목은 logs/rent-unmatched-{ts}.json 에 기록
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import fs from "fs";
import { toContractDate } from "../lib/utils/dateUtils";

const API_KEY = process.env.MOLIT_API_KEY ?? "";
const BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

const REGIONS: Record<string, string> = {
  창원시: "48240",
  김해시: "48250",
};

const DRY_RUN = process.argv.includes("--dry-run");

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface RentRaw {
  aptNm: string;
  umdNm: string;
  excluUseAr: number | string;
  dealYear: number | string;
  dealMonth: number | string;
  dealDay: number | string;
  deposit: string;         // "55,000" (만원, 쉼표 포함)
  monthlyRent: number | string;
  floor: number | string;
  sggCd: number | string;
}

interface Unmatched {
  aptNm: string;
  umdNm: string;
  deposit: string;
  month: string;
}

// ── API 호출 ──────────────────────────────────────────────────────────────────

async function fetchRentPage(lawdCd: string, dealYmd: string): Promise<RentRaw[]> {
  const url =
    `${BASE_URL}?serviceKey=${API_KEY}` +
    `&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=999&_type=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${lawdCd}/${dealYmd}`);

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`JSON 파싱 실패 (${lawdCd}/${dealYmd}): ${text.slice(0, 120)}`);
  }

  const resultCode: string = json?.response?.header?.resultCode ?? "";
  if (!/^0+$/.test(resultCode)) {
    const msg = json?.response?.header?.resultMsg ?? "알수없음";
    throw new Error(`API 에러 [${resultCode}]: ${msg}`);
  }

  const items = json?.response?.body?.items;
  if (!items || typeof items !== "object") return [];
  const item = items.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.replace(/\s+/g, "").replace(/아파트$/, "").toLowerCase();
}

function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  return 0;
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function getMonthsBack(months: number): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("\n❌ MOLIT_API_KEY가 없습니다. .env.local을 확인하세요.\n");
    process.exit(1);
  }

  const { prisma } = await import("../lib/db.js");

  // CLI 인자 파싱
  const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
  let periods: Array<{ year: number; month: number }>;

  if (args.length >= 2) {
    const year = parseInt(args[0]);
    const month = parseInt(args[1]);
    if (isNaN(year) || isNaN(month)) {
      console.error("사용법: npx tsx scripts/fetch-rent-data.ts [YYYY MM]");
      process.exit(1);
    }
    periods = [{ year, month }];
  } else {
    periods = getMonthsBack(12);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  리얼레코드 | MOLIT 전세 실거래 수집");
  console.log(`  기간: ${periods.at(-1)!.year}-${periods.at(-1)!.month}월 ~ ${periods[0].year}-${periods[0].month}월`);
  if (DRY_RUN) console.log("  [DRY RUN] DB 저장 없음");
  console.log("═══════════════════════════════════════════════════\n");

  // DB에서 기존 단지 전체 로드 (매핑용)
  const allComplexes = await prisma.apartmentComplex.findMany({
    select: { id: true, name: true, dong: true, city: true },
  });

  console.log(`📦 DB 단지 수: ${allComplexes.length}개\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalUnmatched = 0;
  const unmatchedList: Unmatched[] = [];

  for (const { year, month } of periods) {
    const dealYmd = `${year}${String(month).padStart(2, "0")}`;
    console.log(`📅 ${year}년 ${month}월 수집 중...`);

    for (const [cityName, lawdCd] of Object.entries(REGIONS)) {
      try {
        const raws = await fetchRentPage(lawdCd, dealYmd);

        // 전세만 필터 (월세금액 = 0)
        const jeonseRaws = raws.filter((r) => Number(r.monthlyRent) === 0 && r.deposit);

        console.log(`  ${cityName}: ${raws.length}건 → 전세 ${jeonseRaws.length}건`);

        for (const raw of jeonseRaws) {
          const aptName = String(raw.aptNm ?? "").trim();
          const umdNm = String(raw.umdNm ?? "").trim();
          if (!aptName || !umdNm) continue;

          // 가격 파싱
          const depositStr = String(raw.deposit ?? "").replace(/,/g, "").trim();
          const priceManwon = parseInt(depositStr, 10);
          if (isNaN(priceManwon) || priceManwon <= 0) continue;

          // 면적
          const areaSqm = Number(raw.excluUseAr);
          const areaPyeong = Math.round(areaSqm / 3.305785);
          if (isNaN(areaPyeong) || areaPyeong <= 0) continue;

          // 계약일
          const cy = parseInt(String(raw.dealYear));
          const cm = parseInt(String(raw.dealMonth));
          const cd = parseInt(String(raw.dealDay ?? "1"));
          if (isNaN(cy) || isNaN(cm)) continue;
          const contractDate = toContractDate(cy, cm, isNaN(cd) ? 1 : cd);

          // 층
          const floor = parseInt(String(raw.floor ?? "1"));

          // 단지 매칭
          let bestComplex: typeof allComplexes[0] | null = null;
          let bestScore = 0;

          for (const cx of allComplexes) {
            const nameSim = nameSimilarity(aptName, cx.name);
            if (nameSim < 0.8) continue;

            // 동 일치하면 추가 가중
            const dongMatch = normalize(umdNm) === normalize(cx.dong);
            const score = nameSim + (dongMatch ? 0.1 : 0);

            if (score > bestScore) {
              bestScore = score;
              bestComplex = cx;
            }
          }

          if (!bestComplex) {
            totalUnmatched++;
            unmatchedList.push({ aptNm: aptName, umdNm, deposit: raw.deposit, month: dealYmd });
            continue;
          }

          if (DRY_RUN) {
            totalInserted++;
            continue;
          }

          // DB upsert — 중복 방지 (단지+면적+층+계약일+가격)
          const existing = await prisma.rentRecord.findFirst({
            where: {
              complexId: bestComplex.id,
              areaPyeong,
              floor: isNaN(floor) ? 1 : floor,
              contractDate,
              priceManwon,
            },
          });

          if (existing) {
            totalSkipped++;
          } else {
            await prisma.rentRecord.create({
              data: {
                complexId: bestComplex.id,
                areaPyeong,
                priceManwon,
                contractDate,
                floor: isNaN(floor) ? 1 : floor,
              },
            });
            totalInserted++;
          }
        }
      } catch (err: any) {
        console.log(`  ❌ ${cityName} 오류: ${err.message}`);
      }

      await delay(500);
    }
  }

  // 미매칭 목록 저장
  if (unmatchedList.length > 0) {
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const logPath = path.join(logsDir, `rent-unmatched-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(unmatchedList, null, 2));
    console.log(`\n📝 미매칭 목록 → ${logPath}`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  수집 완료");
  console.log(`  ✅ 적재: ${totalInserted}건`);
  console.log(`  ⏭  중복: ${totalSkipped}건`);
  console.log(`  ❓ 미매칭: ${totalUnmatched}건`);
  console.log("═══════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
