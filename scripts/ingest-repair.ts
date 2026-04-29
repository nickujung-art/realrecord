import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const REGIONS: Record<string, string> = {
  "48240": "창원시",
  "48250": "김해시",
};

// 2초 간격 (API 차단 방지용 안전 속도)
const THROTTLE_MS = 2000;

// PM님이 주신 실패 리스트 59건을 정밀 타격 대상으로 등록합니다.
const targets = [
  { year: 2016, month: 5, region: "48240" }, { year: 2016, month: 7, region: "48240" },
  { year: 2016, month: 8, region: "48240" }, { year: 2016, month: 9, region: "48240" },
  { year: 2016, month: 10, region: "48240" }, { year: 2016, month: 11, region: "48240" },
  { year: 2016, month: 12, region: "48240" }, { year: 2017, month: 2, region: "48250" },
  { year: 2017, month: 3, region: "48250" }, { year: 2017, month: 5, region: "48240" },
  { year: 2017, month: 6, region: "48240" }, { year: 2017, month: 8, region: "48250" },
  { year: 2017, month: 11, region: "48240" }, { year: 2018, month: 2, region: "48240" },
  { year: 2018, month: 4, region: "48240" }, { year: 2018, month: 5, region: "48250" },
  { year: 2018, month: 10, region: "48250" }, { year: 2018, month: 12, region: "48240" },
  { year: 2019, month: 3, region: "48240" }, { year: 2019, month: 4, region: "48250" },
  { year: 2019, month: 6, region: "48250" }, { year: 2019, month: 10, region: "48240" },
  { year: 2019, month: 11, region: "48240" }, { year: 2019, month: 12, region: "48240" },
  { year: 2020, month: 4, region: "48250" }, { year: 2020, month: 8, region: "48240" },
  { year: 2020, month: 9, region: "48240" }, { year: 2020, month: 12, region: "48240" },
  { year: 2021, month: 1, region: "48240" }, { year: 2021, month: 4, region: "48240" },
  { year: 2021, month: 5, region: "48240" }, { year: 2021, month: 6, region: "48240" },
  { year: 2021, month: 7, region: "48240" }, { year: 2021, month: 8, region: "48240" },
  { year: 2021, month: 9, region: "48240" }, { year: 2021, month: 11, region: "48240" },
  { year: 2021, month: 12, region: "48250" }, { year: 2022, month: 2, region: "48240" },
  { year: 2022, month: 3, region: "48240" }, { year: 2022, month: 7, region: "48240" },
  { year: 2022, month: 8, region: "48240" }, { year: 2022, month: 11, region: "48240" },
  { year: 2022, month: 12, region: "48240" }, { year: 2023, month: 2, region: "48240" },
  { year: 2023, month: 4, region: "48240" }, { year: 2023, month: 6, region: "48240" },
  { year: 2023, month: 9, region: "48240" }, { year: 2024, month: 4, region: "48240" },
  { year: 2024, month: 5, region: "48240" }, { year: 2024, month: 7, region: "48240" },
  { year: 2024, month: 8, region: "48240" }, { year: 2024, month: 10, region: "48240" },
  { year: 2024, month: 11, region: "48240" }, { year: 2025, month: 1, region: "48240" },
  { year: 2025, month: 5, region: "48240" }, { year: 2025, month: 9, region: "48240" },
  { year: 2025, month: 10, region: "48250" }, { year: 2026, month: 1, region: "48250" },
  { year: 2026, month: 3, region: "48250" }
];

async function main() {
  const { runIngestPipeline } = await import("../lib/ingest/pipeline.js");
  
  console.log(`\n🚀 스나이퍼 모드 가동: 실패한 ${targets.length}건을 정밀 수집합니다.`);
  console.log(`═══════════════════════════════════════════════════════`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const { year, month, region } = targets[i];
    const regionName = REGIONS[region];
    
    console.log(`[${i + 1}/${targets.length}] ${year}-${String(month).padStart(2, '0')} ${regionName} 수집 중...`);

    try {
      await runIngestPipeline(region, year, month);
      console.log(`   ✓ 성공!`);
      successCount++;
    } catch (error) {
      console.error(`   X 다시 실패: ${error instanceof Error ? error.message : "알 수 없는 에러"}`);
      failCount++;
    }

    // 다음 요청까지 잠시 대기 (서버 보호)
    if (i < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`🏁 수집 결과: 성공 ${successCount}, 실패 ${failCount}`);
  if (failCount === 0) {
    console.log(`🎉 축하합니다! 모든 데이터가 완벽하게 채워졌습니다.`);
  } else {
    console.log(`⚠️ 아직 남은 실패 건이 있습니다. 잠시 후 이 스크립트를 다시 돌려주세요.`);
  }
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});