/**
 * 오염 학교 데이터 정리 스크립트
 * 사용법: npx tsx scripts/clean-school-data.ts [--dry-run]
 *
 * 좌표(latitude/longitude)가 없는 단지의 SchoolInfo를 일괄 삭제
 * 이유: 좌표 없이 동 이름 추정으로 저장된 거리는 신뢰도가 낮음
 *       geocode-complexes.ts → fetch-school-data.ts 순서로 재수집이 올바른 흐름
 *
 * 실행 순서:
 *   1. npx tsx scripts/clean-school-data.ts --dry-run   ← 삭제 대상 확인
 *   2. npx tsx scripts/clean-school-data.ts             ← 실제 삭제
 *   3. npx tsx scripts/geocode-complexes.ts             ← 좌표 등록
 *   4. npx tsx scripts/fetch-school-data.ts             ← 학교 데이터 재수집
 *   5. npx tsx scripts/geocode-schools-kakao.ts         ← 카카오 실거리 보완
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const LOG_DIR = path.resolve(process.cwd(), "logs");

async function main() {
  const { prisma } = await import("../lib/db.js");

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  // 좌표 없는 단지 목록
  const noCoordComplexes = await prisma.apartmentComplex.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: { id: true, name: true, dong: true, city: true },
  });

  const complexIds = noCoordComplexes.map((c) => c.id);

  // 해당 단지의 SchoolInfo 전체 조회
  const schoolInfos = await prisma.schoolInfo.findMany({
    where: { complexId: { in: complexIds } },
    select: {
      id: true,
      complexId: true,
      schoolName: true,
      isEstimated: true,
      distance: true,
      complex: { select: { name: true, dong: true, city: true } },
    },
    orderBy: [{ complex: { city: "asc" } }, { complex: { name: "asc" } }],
  });

  console.log(`\n${"═".repeat(58)}`);
  console.log(` 오염 학교 데이터 정리${DRY_RUN ? "  [DRY RUN]" : ""}`);
  console.log(`${"═".repeat(58)}`);
  console.log(`  좌표 미등록 단지:  ${noCoordComplexes.length}개`);
  console.log(`  삭제 대상 SchoolInfo:  ${schoolInfos.length}건`);
  console.log(`${"─".repeat(58)}\n`);

  if (schoolInfos.length === 0) {
    console.log("  삭제할 항목이 없습니다.\n");
    await prisma.$disconnect();
    return;
  }

  // 미리보기 (상위 15건)
  const preview = schoolInfos.slice(0, 15);
  console.log("  삭제 대상 미리보기:");
  preview.forEach((s) => {
    const estimatedLabel = s.isEstimated ? " [추정]" : "";
    console.log(
      `    · ${s.complex.city} ${s.complex.name} (${s.complex.dong})`
      + `  —  ${s.schoolName}  ${s.distance}m${estimatedLabel}`
    );
  });
  if (schoolInfos.length > 15) {
    console.log(`    ... 외 ${schoolInfos.length - 15}건`);
  }

  // 로그 저장 (항상 — dry-run 포함)
  const logFile = path.join(LOG_DIR, `clean-school-data-${Date.now()}.json`);
  fs.writeFileSync(
    logFile,
    JSON.stringify(
      schoolInfos.map((s) => ({
        schoolInfoId: s.id,
        complexId: s.complexId,
        complexName: s.complex.name,
        complexCity: s.complex.city,
        complexDong: s.complex.dong,
        schoolName: s.schoolName,
        distance: s.distance,
        isEstimated: s.isEstimated,
      })),
      null,
      2
    )
  );

  if (!DRY_RUN) {
    const { count } = await prisma.schoolInfo.deleteMany({
      where: { complexId: { in: complexIds } },
    });
    console.log(`\n  삭제 완료: ${count}건`);
    console.log(`  다음 단계: npx tsx scripts/geocode-complexes.ts`);
  } else {
    console.log(`\n  (DRY RUN — 실제 삭제 없음)`);
    console.log(`  실제 실행: npx tsx scripts/clean-school-data.ts`);
  }

  console.log(`  로그: ${logFile}`);
  console.log(`${"═".repeat(58)}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
