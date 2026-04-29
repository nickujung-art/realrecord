/**
 * 카카오 Place API로 학교 거리 보완 스크립트
 * 사용법: npx tsx scripts/geocode-schools-kakao.ts [--dry-run]
 *
 * 단지 좌표 기준 반경 1km 내 SC4(학교) 검색 → NEIS schoolName 교차검증
 * 매칭 성공 시: distance(실거리), grade 업데이트 + isEstimated = false
 *
 * 전제: geocode-complexes.ts 실행 후 단지 좌표가 등록된 상태여야 함
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const THROTTLE_MS = 300;
const SEARCH_RADIUS_M = 1000;
const LOG_DIR = path.resolve(process.cwd(), "logs");

// 학교명에서 비교용 핵심 키워드 추출
// "창원남산초등학교" → "남산초"
// "김해율하초등학교" → "율하초"
function extractSchoolKey(fullName: string): string {
  return fullName
    .replace(/경상남도|창원시|김해시|성산구|의창구|마산|합포구|회원구|진해구/g, "")
    .replace(/\s+/g, "")
    .replace(/초등학교$/, "초")
    .replace(/중학교$/, "중")
    .replace(/고등학교$/, "고")
    .trim();
}

function isSameSchool(dbName: string, kakaoName: string): boolean {
  const dbKey = extractSchoolKey(dbName);
  const kakaoKey = extractSchoolKey(kakaoName);
  if (dbKey.length < 2 || kakaoKey.length < 2) return false;
  return kakaoKey.includes(dbKey) || dbKey.includes(kakaoKey);
}

function distanceToGrade(distanceM: number): string {
  if (distanceM <= 300) return "상";
  if (distanceM <= 700) return "중";
  return "하";
}

async function main() {
  const { prisma } = await import("../lib/db.js");

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error("KAKAO_REST_API_KEY not set");

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  // 좌표 있는 단지 중 isEstimated=true SchoolInfo가 있는 것만
  const complexes = await prisma.apartmentComplex.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      schoolInfos: { some: { isEstimated: true } },
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      schoolInfos: {
        where: { isEstimated: true },
        select: { id: true, schoolName: true, distance: true },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log(`\n${"═".repeat(58)}`);
  console.log(` 카카오 학교 거리 보완${DRY_RUN ? "  [DRY RUN]" : ""}`);
  console.log(` 대상: ${complexes.length}개 단지 (isEstimated=true 보유)`);
  console.log(` 검색 반경: ${SEARCH_RADIUS_M}m`);
  console.log(`${"═".repeat(58)}\n`);

  const logData: object[] = [];
  let updatedCount = 0;
  let noMatchCount = 0;

  for (let i = 0; i < complexes.length; i++) {
    const c = complexes[i];
    const label = `[${i + 1}/${complexes.length}] ${c.name}`;

    try {
      const res = await axios.get(
        "https://dapi.kakao.com/v2/local/search/category.json",
        {
          headers: { Authorization: `KakaoAK ${apiKey}` },
          params: {
            category_group_code: "SC4",
            x: c.longitude,
            y: c.latitude,
            radius: SEARCH_RADIUS_M,
            sort: "distance",
            size: 15,
          },
        }
      );

      const kakaoSchools: Array<{ place_name: string; distance: string }> =
        res.data.documents ?? [];

      for (const school of c.schoolInfos) {
        const match = kakaoSchools.find((k) =>
          isSameSchool(school.schoolName, k.place_name)
        );

        if (match) {
          const realDistanceM = parseInt(match.distance, 10);
          const grade = distanceToGrade(realDistanceM);

          if (!DRY_RUN) {
            await prisma.schoolInfo.update({
              where: { id: school.id },
              data: { distance: realDistanceM, grade, isEstimated: false },
            });
          }

          console.log(
            `  ${label}  ${school.schoolName}  →  ${realDistanceM}m (${grade})  [매칭: ${match.place_name}]`
          );
          logData.push({
            complexId: c.id,
            complexName: c.name,
            schoolId: school.id,
            schoolName: school.schoolName,
            kakaoName: match.place_name,
            prevDistance: school.distance,
            newDistance: realDistanceM,
            grade,
            status: "updated",
          });
          updatedCount++;
        } else {
          console.log(
            `  ${label}  ${school.schoolName}  →  매칭 실패 (반경 ${SEARCH_RADIUS_M}m 내 없음)`
          );
          logData.push({
            complexId: c.id,
            complexName: c.name,
            schoolId: school.id,
            schoolName: school.schoolName,
            kakaoSchoolsFound: kakaoSchools.map((k) => k.place_name),
            status: "no_match",
          });
          noMatchCount++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${label}  ✗  ${msg}`);
      logData.push({ complexId: c.id, status: "error", error: msg });
    }

    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  const logFile = path.join(
    LOG_DIR,
    `geocode-schools-kakao-${Date.now()}.json`
  );
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

  console.log(`\n${"─".repeat(58)}`);
  console.log(`  업데이트 ${updatedCount}건 | 매칭 실패 ${noMatchCount}건`);
  if (DRY_RUN) console.log(`  (DRY RUN — DB 업데이트 없음)`);
  console.log(`  로그: ${logFile}`);
  console.log(`${"═".repeat(58)}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
