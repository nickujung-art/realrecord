/**
 * 10년 치 과거 실거래 데이터 수집 스크립트 (2016-01 ~ 현재)
 * 사용법: npx tsx scripts/ingest-historical.ts
 *
 * - 지역: 48240(창원시), 48250(김해시)
 * - 매 호출 후 2초 throttle (MOLIT API 차단 방지)
 * - 연월 단위 에러 시 console.error 로깅 후 continue (스크립트 전체가 죽지 않음)
 */
import * as dotenv from "dotenv";
import * as path from "path";
import type { IngestSummary } from "../lib/ingest/pipeline.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const REGIONS: Record<string, string> = {
  "48121": "창원시 의창구", // 유니시티 서식지
  "48123": "창원시 성산구", // 용지더샵 서식지
  "48125": "창원시 마산합포구",
  "48127": "창원시 마산회원구",
  "48129": "창원시 진해구",
  "48250": "김해시",
};
const THROTTLE_MS = 2000;
const START = { year: 2015, month: 1 };

async function main() {
  const { runIngestPipeline } = await import("../lib/ingest/pipeline.js");
  const { prisma } = await import("../lib/db.js");

  const now = new Date();
  const END = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };

  // 총 작업 횟수 = (개월 수) * (지역 수)
  const monthCount = (END.year - START.year) * 12 + (END.month - START.month) + 1;
  const regionCount = Object.keys(REGIONS).length;
  const totalTasks = monthCount * regionCount;
  
  let currentTask = 0;
  const failedPeriods: string[] = [];
  const totals = { inserted: 0, cancelled: 0, newRecordHighs: 0 };

  console.log(`\n${"═".repeat(60)}`);
  console.log(` 🚀 리얼레코드 데이터 수집 시작`);
  console.log(` 📅 기간: ${START.year}-01 ~ ${END.year}-${String(END.month).padStart(2, "0")}`);
  console.log(` 📍 지역: 창원 5개 구 + 김해시 (총 ${regionCount}개 지역)`);
  console.log(`${"═".repeat(60)}\n`);

  for (let y = START.year; y <= END.year; y++) {
    const mStart = y === START.year ? START.month : 1;
    const mEnd = y === END.year ? END.month : 12;

    for (let m = mStart; m <= mEnd; m++) {
      const period = `${y}-${String(m).padStart(2, "0")}`;

      for (const [lawdCd, regionName] of Object.entries(REGIONS)) {
        currentTask++;
        // ★ 순서 중요: y(연도), m(월), lawdCd(지역코드)
        const label = `[${currentTask}/${totalTasks}] ${period} ${regionName}`;
        
        try {
          // 인자 순서 수정: (year, month, region)
          const s = await runIngestPipeline(lawdCd, y, m); 
          
          totals.inserted += s.inserted;
          totals.cancelled += s.cancelled;
          totals.newRecordHighs += s.newRecordHighs;
          
          console.log(
            `${label} ✓  +${s.inserted}건 | 취소 ${s.cancelled}건 | 신고가 ${s.newRecordHighs}건`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`${label} ✗  실패 — ${msg}`);
          failedPeriods.push(`${period} ${regionName}: ${msg}`);
        }

        // 호출 간격 유지
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }
  }

  // ── 최종 리포트 ──────────────────────────────────────────────────
  const [complexCount, txCount, recordHighCount, cancelCount] = await Promise.all([
    prisma.apartmentComplex.count(),
    prisma.transaction.count(),
    prisma.recordHighPrice.count(),
    prisma.cancellationLog.count(),
  ]);

  const top5 = await prisma.recordHighPrice.findMany({
    orderBy: { currentPrice: "desc" },
    take: 5,
    include: { complex: { select: { name: true, dong: true } } },
  });

  console.log(`\n${"─".repeat(55)}`);
  console.log(`  수집 결과 요약`);
  console.log(`${"─".repeat(55)}`);
  console.log(`  신규 거래    ${totals.inserted.toLocaleString()} 건`);
  console.log(`  취소 처리    ${totals.cancelled.toLocaleString()} 건`);
  console.log(`  신고가 경신  ${totals.newRecordHighs.toLocaleString()} 건`);

  if (failedPeriods.length > 0) {
    console.log(`\n  실패 연월 (재실행 필요): ${failedPeriods.length} 건`);
    failedPeriods.slice(0, 10).forEach((f) => console.log(`    · ${f}`));
    if (failedPeriods.length > 10) console.log(`    ... 외 ${failedPeriods.length - 10} 건`);
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`  DB 현황 (누적)`);
  console.log(`${"─".repeat(55)}`);
  console.log(`  등록 단지    ${complexCount.toLocaleString()} 개`);
  console.log(`  총 거래      ${txCount.toLocaleString()} 건`);
  console.log(`  신고가 기록  ${recordHighCount.toLocaleString()} 건`);
  console.log(`  취소 이력    ${cancelCount.toLocaleString()} 건`);

  if (top5.length > 0) {
    console.log(`\n  역대 최고가 Top 5`);
    top5.forEach((r, i) => {
      const eok = (r.currentPrice / 10000).toFixed(1);
      console.log(
        `  ${i + 1}. ${r.complex.name} (${r.complex.dong})  ${Math.round(r.areaPyeong * 3.305785)}㎡  →  ${eok}억`,
      );
    });
  }

  console.log(`\n${"═".repeat(55)}\n`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
