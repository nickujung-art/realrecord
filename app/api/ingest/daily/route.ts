import { NextRequest, NextResponse } from "next/server";
import { runIngestPipeline } from "@/lib/ingest/pipeline";

// 수집 대상 지역 (창원 48240, 김해 48250)
const TARGETS = [
  { lawdCd: "48240", city: "창원" },
  { lawdCd: "48250", city: "김해" },
] as const;

// Vercel Cron은 GET으로 호출함
// Authorization: Bearer <CRON_SECRET> 헤더 필수
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  // Vercel Cron은 Authorization: Bearer <CRON_SECRET>을 자동 전송함
  // INGEST_SECRET은 수동 curl 호출용 fallback
  const expectedToken = process.env.CRON_SECRET ?? process.env.INGEST_SECRET;
  if (!token || !expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 전날 데이터 수집 (신고 접수 지연 대응: 당일보다 전일이 더 완전)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dealYear = yesterday.getFullYear();
  const dealMonth = yesterday.getMonth() + 1;
  const dateLabel = yesterday.toISOString().split("T")[0];

  const settled = await Promise.allSettled(
    TARGETS.map(({ lawdCd, city }) =>
      runIngestPipeline(lawdCd, dealYear, dealMonth).then((summary) => ({
        city,
        lawdCd,
        summary,
      }))
    )
  );

  const results = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { city: TARGETS[i].city, lawdCd: TARGETS[i].lawdCd, error: String(r.reason) }
  );

  const totalInserted = results.reduce(
    (acc, r) => acc + ("summary" in r ? r.summary.inserted : 0),
    0
  );

  console.log(`[daily-ingest] ${dateLabel} 완료 — 신규: ${totalInserted}건`);

  return NextResponse.json({ success: true, date: dateLabel, totalInserted, results });
}
