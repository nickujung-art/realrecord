import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SUMMER_MONTHS = new Set(["06", "07", "08"]);
const WINTER_MONTHS = new Set(["12", "01", "02"]);

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const targetArea = Number(req.nextUrl.searchParams.get("targetArea"));
  if (!Number.isFinite(targetArea) || targetArea <= 0) {
    return NextResponse.json(
      { error: "targetArea는 양수 숫자여야 합니다." },
      { status: 400 }
    );
  }

  try {
    const complex = await prisma.apartmentComplex.findUnique({
      where: { id },
      select: { maintenanceAreaSum: true },
    });

    if (!complex) {
      return NextResponse.json({ error: "단지를 찾을 수 없습니다." }, { status: 404 });
    }

    const { maintenanceAreaSum } = complex;
    if (!maintenanceAreaSum || maintenanceAreaSum <= 0) {
      return NextResponse.json(
        { error: "해당 단지의 관리비 부과면적 데이터가 없습니다." },
        { status: 422 }
      );
    }

    // 최근 12개월 — yearMonth "YYYYMM"은 사전순 = 시간순
    const fees = await prisma.maintenanceFee.findMany({
      where: { complexId: id },
      orderBy: { yearMonth: "desc" },
      take: 12,
      select: { yearMonth: true, totalFeeWon: true },
    });

    if (fees.length === 0) {
      return NextResponse.json(
        { error: "관리비 이력 데이터가 없습니다." },
        { status: 404 }
      );
    }

    // 공급면적 추정: 전용면적 × 1.3 (전용률 ~77% 역산)
    const supplyArea = targetArea * 1.3;

    // desc 순서대로 계절 필터용 데이터 생성
    const estimated = fees.map(({ yearMonth, totalFeeWon }) => ({
      yearMonth,
      month: yearMonth.slice(-2),
      fee: Math.round((totalFeeWon / maintenanceAreaSum) * supplyArea),
    }));

    // 스파크라인은 시간 오름차순 (과거 → 현재) 이어야 자연스러움
    const monthlyTrend = [...estimated]
      .reverse()
      .map(({ yearMonth, fee }) => ({ month: yearMonth, fee }));

    return NextResponse.json({
      average: avg(estimated.map(({ fee }) => fee)),
      summer: avg(estimated.filter(({ month }) => SUMMER_MONTHS.has(month)).map(({ fee }) => fee)),
      winter: avg(estimated.filter(({ month }) => WINTER_MONTHS.has(month)).map(({ fee }) => fee)),
      monthlyTrend,
    });
  } catch (error) {
    console.error("[/api/complex/[id]/maintenance-fee]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
