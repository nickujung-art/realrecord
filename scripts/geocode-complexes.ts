/**
 * 단지 좌표(latitude/longitude) 일괄 적재 스크립트
 * 사용법: npx tsx scripts/geocode-complexes.ts [--dry-run]
 *
 * 1차: 카카오 주소 검색 API (roadAddress 기반)
 * 2차: 카카오 키워드 검색 fallback (시+동+단지명)
 * 성공 시 dataStatus = "GEOCODED" 업데이트
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const THROTTLE_MS = 300;
const LOG_DIR = path.resolve(process.cwd(), "logs");

interface KakaoDoc {
  y: string;
  x: string;
  address_name?: string;
  place_name?: string;
}

async function main() {
  const { prisma } = await import("../lib/db.js");

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error("KAKAO_REST_API_KEY not set");

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const complexes = await prisma.apartmentComplex.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
      dong: true,
      roadAddress: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${"═".repeat(58)}`);
  console.log(` 단지 좌표 적재${DRY_RUN ? "  [DRY RUN]" : ""}`);
  console.log(` 대상: ${complexes.length}개 단지 (좌표 미등록)`);
  console.log(`${"═".repeat(58)}\n`);

  const logData: object[] = [];
  let geocoded = 0;
  let notFound = 0;
  let errored = 0;
  const headers = { Authorization: `KakaoAK ${apiKey}` };

  for (let i = 0; i < complexes.length; i++) {
    const c = complexes[i];
    const label = `[${i + 1}/${complexes.length}] ${c.name}`;

    try {
      let result: KakaoDoc | null = null;
      let matchedBy = "";

      // 1차: 도로명 주소로 좌표 검색
      if (c.roadAddress) {
        const res = await axios.get(
          "https://dapi.kakao.com/v2/local/search/address.json",
          { headers, params: { query: c.roadAddress, size: 1 } }
        );
        result = res.data.documents[0] ?? null;
        if (result) matchedBy = "address";
      }

      // 2차: 키워드 검색 fallback
      if (!result) {
        const query = [c.city, c.dong, c.name].filter(Boolean).join(" ");
        const res = await axios.get(
          "https://dapi.kakao.com/v2/local/search/keyword.json",
          { headers, params: { query, size: 1 } }
        );
        result = res.data.documents[0] ?? null;
        if (result) matchedBy = "keyword";
      }

      if (result) {
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);

        if (!DRY_RUN) {
          await prisma.apartmentComplex.update({
            where: { id: c.id },
            data: { latitude: lat, longitude: lng, dataStatus: "GEOCODED" },
          });
        }

        console.log(
          `  ${label}  ✓  ${lat.toFixed(6)}, ${lng.toFixed(6)}  (${matchedBy})`
        );
        logData.push({
          id: c.id,
          name: c.name,
          lat,
          lng,
          matchedBy,
          status: "ok",
        });
        geocoded++;
      } else {
        console.log(`  ${label}  -  검색 결과 없음`);
        logData.push({ id: c.id, name: c.name, status: "not_found" });
        notFound++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${label}  ✗  ${msg}`);
      logData.push({ id: c.id, name: c.name, status: "error", error: msg });
      errored++;
    }

    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  const logFile = path.join(LOG_DIR, `geocode-complexes-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

  console.log(`\n${"─".repeat(58)}`);
  console.log(`  성공 ${geocoded}개 | 미발견 ${notFound}개 | 오류 ${errored}개`);
  if (DRY_RUN) console.log(`  (DRY RUN — DB 업데이트 없음)`);
  console.log(`  로그: ${logFile}`);
  console.log(`${"═".repeat(58)}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n[FATAL]", err.message ?? err);
  process.exit(1);
});
