/**
 * compute-map-priority.ts
 *
 * 단지별 mapPriorityScore를 계산하고 ApartmentComplex를 일괄 갱신합니다.
 * Vercel Cron 또는 수동으로 실행합니다.
 *
 * 사용법:
 *   npx tsx scripts/compute-map-priority.ts           # 실제 DB 업데이트
 *   npx tsx scripts/compute-map-priority.ts --dry-run # 점수만 출력, DB 미변경
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── 설정값 ────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 50; // DB 트랜잭션 묶음 크기
const LOG_DIR = path.resolve(process.cwd(), "logs");

// 우선순위 점수 가중치
const WEIGHT = {
  ADVERTISED: 1000,   // 광고 단지 — 최상단 고정 노출
  RECORD_HIGH: 500,   // 최근 7일 신고가 발생
  VIEW_CAP: 200,      // 트렌드(조회수) 점수 상한
  VIEW_PER_HIT: 2,    // 조회 1회당 점수
} as const;

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// ── 타입 ──────────────────────────────────────────────────────────
interface ComplexUpdate {
  id: string;
  mapPriorityScore: number;
  hasRecentCancellation: boolean;
  recentRecordHighAt: Date | null;
  trendScore: number;
  representativePrice: number | null;
  representativeArea: string | null;
  mapDataUpdatedAt: Date;
}

interface LogEntry {
  id: string;
  name?: string;
  mapPriorityScore: number;
  isAdvertised: boolean;
  hasRecentRecordHigh: boolean;
  hasRecentCancellation: boolean;
  trendScore: number;
  representativePrice: number | null;
  representativeArea: string | null;
}

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  const { prisma } = await import("../lib/db.js");
  const now = new Date();

  console.log(`\n🗺️  compute-map-priority 시작 (${DRY_RUN ? "DRY-RUN" : "LIVE"})`);
  console.log(`   기준 시각: ${now.toISOString()}`);
  console.log(`   7일 이전: ${SEVEN_DAYS_AGO.toISOString()}\n`);

  // ── 1. 사전 데이터 일괄 로드 (N+1 방지) ──────────────────────────

  // 1-a. 광고 활성 단지 ID 집합
  const advertisedRows = await prisma.apartmentAdvertiser.findMany({
    where: { advertiser: { isActive: true } },
    select: { complexId: true },
  });
  const advertisedSet = new Set(advertisedRows.map((r) => r.complexId));
  console.log(`✅ 광고 단지: ${advertisedSet.size}개`);

  // 1-b. 최근 7일 신고가 — 단지별 가장 최신 recordSetAt
  const recentRHRows = await prisma.recordHighPrice.findMany({
    where: { recordSetAt: { gte: SEVEN_DAYS_AGO } },
    select: { complexId: true, recordSetAt: true },
    orderBy: { recordSetAt: "desc" },
  });
  const recentRHMap = new Map<string, Date>();
  for (const row of recentRHRows) {
    if (!recentRHMap.has(row.complexId)) {
      recentRHMap.set(row.complexId, row.recordSetAt);
    }
  }
  console.log(`✅ 최근 7일 신고가 단지: ${recentRHMap.size}개`);

  // 1-c. 최근 7일 취소 감지 단지 ID 집합
  const cancelRows = await prisma.cancellationLog.findMany({
    where: { detectedAt: { gte: SEVEN_DAYS_AGO } },
    select: { complexId: true },
    distinct: ["complexId"],
  });
  const cancelSet = new Set(cancelRows.map((r) => r.complexId));
  console.log(`✅ 최근 7일 취소 단지: ${cancelSet.size}개`);

  // 1-d. 대표 가격 — 단지별 가장 최근 신고가 (날짜 기준)
  //      `distinct + orderBy` 조합으로 단지당 최신 1건만 가져옴
  const repPriceRows = await prisma.recordHighPrice.findMany({
    orderBy: { recordSetAt: "desc" },
    distinct: ["complexId"],
    select: {
      complexId: true,
      currentPrice: true,
      areaPyeong: true,
    },
  });
  const repMap = new Map<string, { price: number; area: string }>();
  for (const row of repPriceRows) {
    repMap.set(row.complexId, {
      price: row.currentPrice,
      area: `${Math.round(row.areaPyeong)}평`,
    });
  }
  console.log(`✅ 대표 가격 보유 단지: ${repMap.size}개`);

  // 1-e. 최근 7일 조회수 집계 (ComplexView)
  const viewGroups = await prisma.complexView.groupBy({
    by: ["complexId"],
    where: { viewedAt: { gte: SEVEN_DAYS_AGO } },
    _count: { id: true },
  });
  const viewCountMap = new Map<string, number>();
  for (const g of viewGroups) {
    viewCountMap.set(g.complexId, g._count.id);
  }
  console.log(`✅ 조회 기록 보유 단지: ${viewCountMap.size}개`);

  // ── 2. 전체 단지 ID + 이름 로드 ──────────────────────────────────
  const allComplexes = await prisma.apartmentComplex.findMany({
    select: { id: true, name: true },
  });
  console.log(`\n📋 전체 단지 수: ${allComplexes.length}개\n`);

  // ── 3. 각 단지 점수 계산 ──────────────────────────────────────────
  const updates: ComplexUpdate[] = [];
  const logEntries: LogEntry[] = [];

  for (const complex of allComplexes) {
    const { id, name } = complex;

    const isAdvertised = advertisedSet.has(id);
    const recordHighAt = recentRHMap.get(id) ?? null;
    const hasRecentCancellation = cancelSet.has(id);
    const rep = repMap.get(id) ?? null;
    const viewHits = viewCountMap.get(id) ?? 0;

    // trendScore: 조회수 × 가중치, 상한 적용
    const trendScore = Math.min(viewHits * WEIGHT.VIEW_PER_HIT, WEIGHT.VIEW_CAP);

    // mapPriorityScore 합산
    const mapPriorityScore =
      (isAdvertised ? WEIGHT.ADVERTISED : 0) +
      (recordHighAt ? WEIGHT.RECORD_HIGH : 0) +
      trendScore;

    updates.push({
      id,
      mapPriorityScore,
      hasRecentCancellation,
      recentRecordHighAt: recordHighAt,
      trendScore,
      representativePrice: rep?.price ?? null,
      representativeArea: rep?.area ?? null,
      mapDataUpdatedAt: now,
    });

    // 주목할 단지만 로그에 기록 (광고·신고가·취소·트렌드 해당)
    if (isAdvertised || recordHighAt || hasRecentCancellation || trendScore > 0) {
      logEntries.push({
        id,
        name,
        mapPriorityScore,
        isAdvertised,
        hasRecentRecordHigh: !!recordHighAt,
        hasRecentCancellation,
        trendScore,
        representativePrice: rep?.price ?? null,
        representativeArea: rep?.area ?? null,
      });
    }
  }

  // 점수 상위 20개 미리보기
  const top20 = [...updates]
    .sort((a, b) => b.mapPriorityScore - a.mapPriorityScore)
    .slice(0, 20);

  console.log("🏆 점수 상위 단지 (Top 20):");
  for (const u of top20) {
    const name = allComplexes.find((c) => c.id === u.id)?.name ?? u.id;
    const rep = u.representativePrice
      ? `  ${u.representativePrice.toLocaleString()}만원(${u.representativeArea})`
      : "";
    console.log(
      `  [${String(Math.round(u.mapPriorityScore)).padStart(4)}] ${name}${rep}`
    );
  }
  console.log();

  // ── 4. DB 업데이트 (배치) ─────────────────────────────────────────
  if (!DRY_RUN) {
    let done = 0;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.apartmentComplex.update({
            where: { id: u.id },
            data: {
              mapPriorityScore: u.mapPriorityScore,
              hasRecentCancellation: u.hasRecentCancellation,
              recentRecordHighAt: u.recentRecordHighAt,
              trendScore: u.trendScore,
              representativePrice: u.representativePrice,
              representativeArea: u.representativeArea,
              mapDataUpdatedAt: u.mapDataUpdatedAt,
            },
          })
        )
      );
      done += batch.length;
      process.stdout.write(`\r   업데이트 진행: ${done}/${updates.length}`);
    }
    console.log("\n✅ DB 업데이트 완료\n");
  } else {
    console.log("⏭️  DRY-RUN: DB 업데이트 생략\n");
  }

  // ── 5. 로그 저장 ──────────────────────────────────────────────────
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = path.join(LOG_DIR, `map-priority-${ts}.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        runAt: now.toISOString(),
        dryRun: DRY_RUN,
        totalComplexes: allComplexes.length,
        updatedComplexes: updates.length,
        notableComplexes: logEntries.length,
        stats: {
          advertisedCount: advertisedSet.size,
          recentRecordHighCount: recentRHMap.size,
          recentCancellationCount: cancelSet.size,
          trendingCount: viewCountMap.size,
        },
        notableEntries: logEntries.sort((a, b) => b.mapPriorityScore - a.mapPriorityScore),
      },
      null,
      2
    )
  );
  console.log(`📄 로그 저장: ${logPath}`);

  await prisma.$disconnect();
  console.log("\n🎉 compute-map-priority 완료\n");
}

main().catch((e) => {
  console.error("❌ 오류 발생:", e);
  process.exit(1);
});
