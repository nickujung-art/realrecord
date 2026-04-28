/**
 * 전체 지역 실거래 데이터 수집 스크립트
 * 사용법: npx tsx scripts/ingest-all.ts [YYYY] [MM]
 *
 * dotenv.config()가 호이스팅되는 static import보다 먼저 실행되도록
 * 실제 DB/파이프라인 모듈은 async main() 내부에서 dynamic import한다.
 */
import * as dotenv from "dotenv";
import * as path from "path";
import type { IngestSummary } from "../lib/ingest/pipeline.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const REGIONS: Record<string, string> = {
  "48240": "창원시",
  "48250": "김해시",
};

async function main() {
  const { runIngestPipeline } = await import("../lib/ingest/pipeline.js");
  const { prisma } = await import("../lib/db.js");

  const now = new Date();
  const year = parseInt(
    process.argv[2] ??
      String(now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()),
  );
  const month = parseInt(
    process.argv[3] ?? String(now.getUTCMonth() === 0 ? 12 : now.getUTCMonth()),
  );

  const period = `${year}-${String(month).padStart(2, "0")}`;
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  리얼레코드 데이터 인제스트  |  ${period}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const totals: IngestSummary = {
    lawdCd: "ALL", period,
    inserted: 0, updated: 0, cancelled: 0, newRecordHighs: 0,
    errors: [],
  };

  for (const [lawdCd, regionName] of Object.entries(REGIONS)) {
    process.stdout.write(`  ▶ ${regionName} (${lawdCd}) ... `);
    try {
      const s = await runIngestPipeline(lawdCd, year, month);
      console.log(
        `✓  +${s.inserted}건 | 취소 ${s.cancelled}건 | 신고가 ${s.newRecordHighs}건` +
          (s.errors.length ? ` | ⚠ 오류 ${s.errors.length}건` : ""),
      );
      totals.inserted += s.inserted;
      totals.updated += s.updated;
      totals.cancelled += s.cancelled;
      totals.newRecordHighs += s.newRecordHighs;
      totals.errors.push(...s.errors.slice(0, 3));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗  실패: ${msg}`);
      totals.errors.push(`[${regionName}] ${msg}`);
    }
  }

  // ── DB 현황 집계 ──────────────────────────────────────────────────
  const [complexCount, txCount, recordHighCount, cancelCount] = await Promise.all([
    prisma.apartmentComplex.count(),
    prisma.transaction.count(),
    prisma.recordHighPrice.count(),
    prisma.cancellationLog.count(),
  ]);

  const top5 = await prisma.recordHighPrice.findMany({
    orderBy: { currentPrice: "desc" },
    take: 5,
    include: { complex: { select: { name: true, dong: true, city: true } } },
  });

  console.log(`\n───────────────────────────────────────────────────`);
  console.log(`  인제스트 결과 요약`);
  console.log(`───────────────────────────────────────────────────`);
  console.log(`  신규 거래    ${totals.inserted.toLocaleString()} 건`);
  console.log(`  업데이트     ${totals.updated.toLocaleString()} 건`);
  console.log(`  취소 처리    ${totals.cancelled.toLocaleString()} 건`);
  console.log(`  신고가 경신  ${totals.newRecordHighs.toLocaleString()} 건`);
  if (totals.errors.length > 0) {
    console.log(`  오류         ${totals.errors.length} 건`);
    totals.errors.slice(0, 5).forEach((e) => console.log(`    · ${e}`));
  }

  console.log(`\n───────────────────────────────────────────────────`);
  console.log(`  DB 현황 (누적)`);
  console.log(`───────────────────────────────────────────────────`);
  console.log(`  등록 단지    ${complexCount.toLocaleString()} 개`);
  console.log(`  총 거래      ${txCount.toLocaleString()} 건`);
  console.log(`  신고가 기록  ${recordHighCount.toLocaleString()} 건`);
  console.log(`  취소 이력    ${cancelCount.toLocaleString()} 건`);

  if (top5.length > 0) {
    console.log(`\n  ── 역대 최고가 Top 5 ─────────────────────────────`);
    top5.forEach((r, i) => {
      const eok = (r.currentPrice / 10000).toFixed(1);
      console.log(
        `  ${i + 1}. ${r.complex.name} (${r.complex.dong})  ` +
          `${Math.round(r.areaPyeong * 3.305785)}㎡  →  ${eok}억`,
      );
    });
  }

  console.log(`\n═══════════════════════════════════════════════════\n`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
