import { NextResponse } from "next/server";

// 이 엔드포인트는 더 이상 사용하지 않습니다 (기간별 탭 제거됨)
export function GET() {
  return NextResponse.json({ error: "Deprecated" }, { status: 410 });
}
