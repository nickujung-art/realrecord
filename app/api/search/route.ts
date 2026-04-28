import { NextRequest, NextResponse } from "next/server";
import { searchComplexes } from "@/lib/queries/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");

  if (!q.trim()) {
    return NextResponse.json({ results: [], total: 0, query: q });
  }

  try {
    const data = await searchComplexes(q, Math.min(limit, 50));
    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/search]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
