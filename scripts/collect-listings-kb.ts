/**
 * KB부동산 매물 수 배치 수집 스크립트
 *
 * 사용법: npx tsx scripts/collect-listings-kb.ts
 *
 * - DB에서 kbComplexNo가 등록된 모든 단지를 가져와 순차 크롤링
 * - 결과를 ListingStats 테이블에 upsert (오늘 날짜 기준)
 * - 단지 간 3초 딜레이로 서버 부하 방지
 * - 실패 단지는 건너뛰고 계속 진행, 최종 요약에 기록
 */

import * as dotenv from "dotenv";
import * as path from "path";
import puppeteer from "puppeteer";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DELAY_MS = 3000;
const PAGE_LOAD_WAIT_MS = 6000;

// ── Crawler ───────────────────────────────────────────────────────────────────

interface ListingStats {
  saleCount: number;
  rentCount: number;
}

async function fetchKBListings(kbNo: string): Promise<ListingStats | null> {
  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    );

    await page.goto(`https://www.kbland.kr/pl/${kbNo}`, {
      waitUntil: "networkidle2",
      timeout: 40000,
    });

    await new Promise((r) => setTimeout(r, PAGE_LOAD_WAIT_MS));

    const stats = await page.evaluate(() => {
      const text = document.body.innerText;
      const saleMatch = text.match(/매매\s*(\d+)/);
      const rentMatch = text.match(/전세\s*(\d+)/);
      return {
        sale: saleMatch ? parseInt(saleMatch[1], 10) : 0,
        rent: rentMatch ? parseInt(rentMatch[1], 10) : 0,
      };
    });

    return { saleCount: stats.sale, rentCount: stats.rent };
  } catch (err: any) {
    throw new Error(`페이지 수집 실패: ${err.message}`);
  } finally {
    await browser.close();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function bar(current: number, total: number, width = 20): string {
  const filled = Math.round((current / total) * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { prisma } = await import("../lib/db.js");
  const startedAt = Date.now();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  리얼레코드 | KB부동산 매물 수 배치 수집");
  console.log(`  실행 시각: ${new Date().toLocaleString("ko-KR")}`);
  console.log("═══════════════════════════════════════════════════\n");

  // 1. 수집 대상 조회
  const complexes = await prisma.apartmentComplex.findMany({
    where: { kbComplexNo: { not: null } },
    select: { id: true, name: true, kbComplexNo: true, dong: true },
    orderBy: { name: "asc" },
  });

  if (complexes.length === 0) {
    console.log(
      "⚠️  kbComplexNo가 등록된 단지가 없습니다.\n" +
        "    map-kb-ids 스크립트를 먼저 실행해주세요.\n",
    );
    return;
  }

  const total = complexes.length;
  console.log(`📡 수집 대상: ${total}개 단지\n`);

  const today = todayMidnight();
  const succeeded: string[] = [];
  const failed: Array<{ name: string; reason: string }> = [];

  // 2. 단지별 수집 루프
  for (let i = 0; i < total; i++) {
    const cx = complexes[i];
    const idx = `[${String(i + 1).padStart(3, " ")}/${total}]`;
    const progress = bar(i + 1, total);

    console.log(`\n${progress} ${idx}`);
    console.log(`  🏠 ${cx.name}  (KB번호: ${cx.kbComplexNo})`);

    const t0 = Date.now();

    try {
      const stats = await fetchKBListings(cx.kbComplexNo!);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      if (!stats) throw new Error("빈 응답");

      // 3. DB upsert
      await prisma.listingStats.upsert({
        where: { complexId_date: { complexId: cx.id, date: today } },
        update: { saleCount: stats.saleCount, rentCount: stats.rentCount },
        create: {
          complexId: cx.id,
          date: today,
          saleCount: stats.saleCount,
          rentCount: stats.rentCount,
        },
      });

      console.log(
        `  ✅ 매매 ${String(stats.saleCount).padStart(3, " ")}건 · 전세 ${String(stats.rentCount).padStart(3, " ")}건  (${elapsed}s)`,
      );
      succeeded.push(cx.name);
    } catch (err: any) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const reason = err.message ?? String(err);
      console.log(`  ❌ 실패: ${reason}  (${elapsed}s)`);
      failed.push({ name: cx.name, reason });
    }

    // 4. 딜레이 (마지막 단지 제외)
    if (i < total - 1) {
      process.stdout.write(`  ⏳ 다음 단지까지 ${DELAY_MS / 1000}초 대기...\n`);
      await delay(DELAY_MS);
    }
  }

  // 5. 최종 요약
  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log("\n───────────────────────────────────────────────────");
  console.log("  수집 결과 요약");
  console.log("───────────────────────────────────────────────────");
  console.log(
    `  ✅ 성공   ${String(succeeded.length).padStart(4, " ")}개 / ${total}개`,
  );
  console.log(
    `  ❌ 실패   ${String(failed.length).padStart(4, " ")}개 / ${total}개`,
  );
  console.log(`  ⏱  소요   ${totalSec}초`);

  if (failed.length > 0) {
    console.log("\n  실패 단지 목록:");
    for (const f of failed) {
      console.log(`    · ${f.name} — ${f.reason}`);
    }
  }

  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("\n[FATAL]", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
