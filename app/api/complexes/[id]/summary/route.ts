import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ComplexSummary } from "@/types/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [complex, recentTxs, latestReview] = await Promise.all([
    prisma.apartmentComplex.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        dong: true,
        representativePrice: true,
        representativeArea: true,
      },
    }),
    // 취소 제외 최근 5건 — 스파크라인 소스
    prisma.transaction.findMany({
      where: { complexId: id, cancelFlag: false },
      orderBy: { contractDate: "desc" },
      take: 5,
      select: {
        contractDate: true,
        priceManwon: true,
        areaPyeong: true,
      },
    }),
    // 가장 최신 리뷰 1건
    prisma.complexReview.findFirst({
      where: { complexId: id },
      orderBy: { createdAt: "desc" },
      select: { content: true, authorName: true, rating: true },
    }),
  ]);

  if (!complex) {
    return NextResponse.json({ error: "단지를 찾을 수 없습니다." }, { status: 404 });
  }

  const body: ComplexSummary = {
    id: complex.id,
    name: complex.name,
    dong: complex.dong,
    representativePrice: complex.representativePrice,
    representativeArea: complex.representativeArea,
    // 날짜 오름차순으로 정렬해 클라이언트가 바로 렌더링 가능하게 반환
    recentTransactions: recentTxs
      .map((tx) => ({
        contractDate: tx.contractDate.toISOString().slice(0, 10),
        priceManwon: tx.priceManwon,
        areaPyeong: tx.areaPyeong,
      }))
      .reverse(), // DB 내림차순 → 오름차순(oldest first) 역전
    latestReview: latestReview ?? null,
  };

  return NextResponse.json(body);
}
