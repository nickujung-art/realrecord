import { NextRequest, NextResponse } from "next/server";
import type { IngestRequest, IngestResponse } from "@/types/api";
import { runIngestPipeline } from "@/lib/ingest/pipeline";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lawdCd, dealYear, dealMonth } = body;
  if (!lawdCd || !dealYear || !dealMonth) {
    return NextResponse.json(
      { error: "lawdCd, dealYear, dealMonth are required" },
      { status: 400 },
    );
  }

  try {
    const summary = await runIngestPipeline(lawdCd, dealYear, dealMonth);
    return NextResponse.json({ success: true, summary } satisfies IngestResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        summary: {
          lawdCd,
          period: `${dealYear}-${String(dealMonth).padStart(2, "0")}`,
          inserted: 0,
          updated: 0,
          cancelled: 0,
          newRecordHighs: 0,
          errors: [msg],
        },
      } satisfies IngestResponse,
      { status: 500 },
    );
  }
}
