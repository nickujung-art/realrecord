/**
 * KB부동산 ID 자동 매핑 스크립트
 *
 * 사용법: npx tsx scripts/map-kb-ids.ts [--dry-run]
 *
 * - DB에서 kbComplexNo가 없는 단지를 조회
 * - KB부동산 검색 API(autocomplete)를 인터셉트하여 ID를 탐색
 * - 신뢰도 ≥ 85% → DB 자동 업데이트
 * - 신뢰도 55–84% → 수동 검토 목록에 기록
 * - 그 외 → 미매핑으로 기록
 * - 상세 로그: logs/kb-mapping-YYYY-MM-DD.json
 */

import * as dotenv from "dotenv";
import puppeteer, { type Browser, type Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const DELAY_MS = 3000;
const AUTO_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.55;

// ── Types ─────────────────────────────────────────────────────────────────────

interface KBCandidate {
  complexNo: string;
  complexName: string;
  dongName: string;
  cityName: string;
}

type MappingStatus = "mapped" | "ambiguous" | "not_found" | "error";

interface MappingResult {
  complexId: string;
  complexName: string;
  dong: string;
  city: string;
  status: MappingStatus;
  kbComplexNo?: string;
  score?: number;
  topCandidates?: KBCandidate[];
  error?: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function normalize(s: string) {
  return s
    .replace(/\s+/g, "")
    .replace(/\(.*\)/g, "") // 💡 비교할 때도 괄호 안의 내용은 무시합니다.
    .replace(/아파트$/g, "")
    .toLowerCase();
}

/**
 * 단순 문자열 유사도: 공통 접두어 + 포함 여부 가중
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  let prefix = 0;
  for (let i = 0; i < Math.min(na.length, nb.length); i++) {
    if (na[i] === nb[i]) prefix++;
    else break;
  }
  return prefix / Math.max(na.length, nb.length);
}

function scoreCandidate(
  candidate: KBCandidate,
  complexName: string,
  dong: string,
): number {
  const nameSim = similarity(complexName, candidate.complexName);
  const dongSim = candidate.dongName ? similarity(dong, candidate.dongName) : 0;
  // 이름 70%, 동 30% 가중
  return nameSim * 0.7 + dongSim * 0.3;
}

function bestMatch(
  candidates: KBCandidate[],
  complexName: string,
  dong: string,
): { candidate: KBCandidate; score: number } | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = scoreCandidate(best, complexName, dong);
  for (const c of candidates.slice(1)) {
    const s = scoreCandidate(c, complexName, dong);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return { candidate: best, score: bestScore };
}

// ── KB부동산 검색 ─────────────────────────────────────────────────────────────

// 현재 검색 요청에 대해 캡처된 후보 목록 (검색 전 반드시 리셋)
let _interceptBuf: KBCandidate[] = [];

function attachInterceptor(page: Page) {
  page.on("response", async (response) => {
    const url = response.url();

    // 💡 KB부동산 API 응답이 오는지 터미널에 실시간으로 찍어봅니다.
    if (url.includes("search") || url.includes("complex")) {
      // console.log(`\n 📡 API 응답 감지: ${url.substring(0, 60)}...`);
    }

    if (!url.startsWith("https://www.kbland.kr")) return;
    const ct = response.headers()["content-type"] ?? "";
    if (!ct.includes("json")) return;

    try {
      const json = await response.json();
      const rawList: any[] = json?.data?.list ?? json?.data?.complexList ?? json?.result?.list ?? json?.list ?? json?.complexList ?? [];
      if (!Array.isArray(rawList) || rawList.length === 0) return;

      const parsed: KBCandidate[] = rawList
        .map((item: any) => ({
          complexNo: String(item.complexNo ?? item.no ?? item.id ?? item.aptNo ?? ""),
          complexName: String(item.complexName ?? item.name ?? item.aptName ?? ""),
          dongName: String(item.dongName ?? item.dong ?? item.bjdName ?? item.jibunDong ?? ""),
          cityName: String(item.cityName ?? item.city ?? item.sigunguName ?? item.gunguName ?? ""),
        }))
        .filter((c) => c.complexNo !== "" && c.complexName !== "");

      if (parsed.length > 0) _interceptBuf.push(...parsed);
    } catch { /* 무시 */ }
  });
}

const KB_SEARCH_SELECTOR = [
  'input[type="search"]',
  'input[type="text"][placeholder*="검색"]',
  'input[placeholder*="단지"]',
  'input[placeholder*="아파트"]',
  ".search-input input",
  "header input",
  'input[class*="search"]',
].join(", ");

async function triggerSearch(page: Page, query: string): Promise<void> {
  try {
    // 검색창이 나타날 때까지 대기
    await page.waitForSelector(KB_SEARCH_SELECTOR, { timeout: 10000 });

    // 💡 강제 포커스 및 값 주입 (가장 확실한 방법)
    await page.evaluate((selector, q) => {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.value = ''; // 기존 값 초기화
        input.focus();
      }
    }, KB_SEARCH_SELECTOR, query);

    // 사람처럼 타이핑 (이벤트 발생을 위해)
    await page.keyboard.type(query, { delay: 100 });
    await page.keyboard.press("Enter");

    await delay(1000);
  } catch (err) {
    // 실패 시 검색 URL로 직접 강제 이동
    await page.goto(`https://www.kbland.kr/search?query=${encodeURIComponent(query)}`, { waitUntil: "networkidle2" });
  }
}



/**
 * 🧼 KB부동산의 팝업과 투명 가림막을 완전히 분쇄합니다.
 */
async function dismissPopups(page: Page) {
  console.log("🧼 팝업 광고 연쇄 철거 시작 (5초간 추적)...");

  for (let i = 0; i < 5; i++) { // 팝업이 늦게 뜨는 경우를 대비해 5번 반복
    await page.evaluate(() => {
      // 1. "닫기" 또는 "하루" 텍스트가 포함된 모든 요소를 찾아 클릭 시도
      const tags = Array.from(document.querySelectorAll('button, a, span, div, li'));
      tags.forEach((el) => {
        const text = el.textContent || '';
        if (text.includes('오늘 하루 보지 않기') || text.trim() === '닫기') {
          (el as HTMLElement).click();
        }
      });

      // 2. 강제 레이어 삭제 (팝업과 관련된 모든 클래스 조준)
      const selectors = [
        '.mat-dialog-container', '.cdk-overlay-container', '.cdk-overlay-backdrop',
        '.p-dialog-mask', '.today_popup_wrap', '.main_popup', '.p-component-overlay',
        '[class*="popup"]', '[class*="modal"]', '[class*="dialog"]', '[class*="overlay"]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // 3. 클릭을 방해하는 투명 배경(Backdrop) 강제 제거
      document.querySelectorAll('[class*="backdrop"], [class*="mask"]').forEach(el => el.remove());

      // 4. 스크롤 및 클릭 잠금 해제
      document.body.style.overflow = 'auto';
      document.body.style.pointerEvents = 'auto';
      document.documentElement.style.overflow = 'auto';
    });

    await new Promise(r => setTimeout(r, 1000)); // 1초 간격으로 체크
  }

  // 5. 마지막 수단: 검색창이 있는 왼쪽 영역(50, 50)을 강제로 한 번 클릭해서 포커스 가져오기
  await page.mouse.click(50, 50);
  console.log("✅ 팝업 철거 및 포커스 강제 이동 완료");
}

async function searchKBComplex(
  page: Page,
  complexName: string,
  dong: string,
): Promise<KBCandidate[]> {
  _interceptBuf = []; // 이전 결과 리셋

  // 1단계: 괄호와 그 안의 내용(지명 등)을 완전히 제거하여 순수 단지명만 추출
  // 예: "1차동원(지내동)" -> "1차동원"
  const cleanName = complexName.replace(/\s*\(.*\)/g, "").trim();

  // 2단계: KB부동산이 가장 좋아하는 [동 + 단지명] 순서로 쿼리 생성
  // 예: "지내동 1차동원"
  const query = `${dong} ${cleanName}`.trim();

  // [디버그 로그] 실제로 어떤 단어로 검색하는지 보여줍니다.
  // process.stdout.write(` (🔍 검색어: ${query}) `);

  await triggerSearch(page, query);

  // 3단계: 자동완성 API 응답 대기 (네트워크 상황에 따라 2.5초 ~ 3.5초)
  await delay(3000);

  // 만약 검색 결과가 없다면, '동'을 빼고 '단지명'으로만 재시도하는 로직 (옵션)
  if (_interceptBuf.length === 0) {
    await triggerSearch(page, cleanName);
    await delay(2000);
  }

  return [..._interceptBuf];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { prisma } = await import("../lib/db.js");
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(
    logDir,
    `kb-mapping-${new Date().toISOString().slice(0, 10)}.json`,
  );

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  리얼레코드 | KB부동산 ID 자동 매핑");
  if (DRY_RUN) console.log("  ⚠️  DRY-RUN 모드 — DB 업데이트 없음");
  console.log("═══════════════════════════════════════════════════\n");

  // 1. 매핑 대상 단지 조회
  const unmapped = await prisma.apartmentComplex.findMany({
    where: { kbComplexNo: null },
    select: { id: true, name: true, dong: true, city: true, district: true },
    orderBy: { name: "asc" },
  });

  if (unmapped.length === 0) {
    console.log("✅ 매핑이 필요한 단지가 없습니다.\n");
    return;
  }

  console.log(`📋 대상 단지: ${unmapped.length}개\n`);

  const results: MappingResult[] = [];
  let mapped = 0,
    ambiguous = 0,
    notFound = 0,
    errors = 0;

  // 2. 브라우저 기동 (단일 인스턴스 재사용)

  const browser: Browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
    slowMo: 50 // 동작을 눈으로 확인할 수 있게 약간 천천히 실행
  });

  const page: Page = await browser.newPage(); // ✅ 여기서 page가 정의됩니다!
  await page.setViewport({ width: 1280, height: 900 });

  attachInterceptor(page); // ✅ page를 함수에 전달

  try {
    await page.goto("https://www.kbland.kr/", {
      waitUntil: "networkidle2",
      timeout: 40000,
    });
    console.log("🌐 KB부동산 접속 완료\n");
  } catch (err: any) {
    console.error("❌ KB부동산 접속 실패:", err.message);
    await browser.close();
    return;
  }

  // 3. 단지별 매핑 루프
  for (let i = 0; i < unmapped.length; i++) {
    const cx = unmapped[i];
    const idx = `[${String(i + 1).padStart(3, " ")}/${unmapped.length}]`;

    process.stdout.write(`${idx} ${cx.name} (${cx.dong}) ... `);

    let result: MappingResult = {
      complexId: cx.id,
      complexName: cx.name,
      dong: cx.dong,
      city: cx.city,
      status: "not_found",
    };

    try {
      const candidates = await searchKBComplex(page, cx.name, cx.dong);

      if (candidates.length === 0) {
        process.stdout.write("⚠️  검색 결과 없음\n");
        result.status = "not_found";
        notFound++;
      } else {
        const match = bestMatch(candidates, cx.name, cx.dong);
        if (!match) {
          process.stdout.write("⚠️  후보 없음\n");
          result.status = "not_found";
          notFound++;
        } else {
          const { candidate, score } = match;
          const pct = `${(score * 100).toFixed(0)}%`;

          if (score >= AUTO_THRESHOLD) {
            if (!DRY_RUN) {
              await prisma.apartmentComplex.update({
                where: { id: cx.id },
                data: { kbComplexNo: candidate.complexNo },
              });
            }
            process.stdout.write(`✅ ${candidate.complexNo}  (${pct})\n`);
            result = {
              ...result,
              status: "mapped",
              kbComplexNo: candidate.complexNo,
              score,
            };
            mapped++;
          } else if (score >= REVIEW_THRESHOLD) {
            process.stdout.write(
              `⚡ 수동 검토 — "${candidate.complexName}" (${pct})\n`,
            );
            result = {
              ...result,
              status: "ambiguous",
              score,
              topCandidates: candidates.slice(0, 5),
            };
            ambiguous++;
          } else {
            process.stdout.write(
              `❌ 매칭 실패 — 후보 ${candidates.length}개, 최고 ${pct}\n`,
            );
            result = {
              ...result,
              status: "not_found",
              score,
              topCandidates: candidates.slice(0, 3),
            };
            notFound++;
          }
        }
      }
    } catch (err: any) {
      process.stdout.write(`💥 오류: ${err.message}\n`);
      result = { ...result, status: "error", error: err.message };
      errors++;
    }

    results.push(result);
    // 매 단지 후 증분 저장 (중단 시 복구 가능)
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2), "utf-8");

    if (i < unmapped.length - 1) {
      process.stdout.write(`     ⏳ ${DELAY_MS / 1000}초 대기...\n`);
      await delay(DELAY_MS);
    }
  }

  await browser.close();

  // 4. 최종 요약
  console.log("\n───────────────────────────────────────────────────");
  console.log("  매핑 결과 요약");
  console.log("───────────────────────────────────────────────────");
  console.log(`  ✅ 자동 매핑 완료    ${String(mapped).padStart(4, " ")}개`);
  console.log(`  ⚡ 수동 검토 필요    ${String(ambiguous).padStart(4, " ")}개`);
  console.log(`  ❌ 매칭 실패         ${String(notFound).padStart(4, " ")}개`);
  if (errors > 0) {
    console.log(`  💥 오류              ${String(errors).padStart(4, " ")}개`);
  }
  if (ambiguous > 0) {
    console.log(`\n  수동 검토 항목은 아래 로그를 참고해 직접 DB를 업데이트하세요:`);
    console.log(`  prisma studio  또는  UPDATE 쿼리`);
  }
  console.log(`\n  📄 상세 로그: ${logPath}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("\n[FATAL]", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
