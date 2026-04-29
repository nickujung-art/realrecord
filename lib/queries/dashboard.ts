import { prisma } from "@/lib/db";
import { getDaysAgoDate, getDateRange } from "@/lib/utils/dateUtils";
import type { DashboardResponse, KingOfDayData, RecordBreakerItem } from "@/types/api";

export async function getDashboardData(): Promise<DashboardResponse> {
  const sevenDaysAgo = getDaysAgoDate(7);
  const thirtyDaysAgo = getDaysAgoDate(30);

  // [DEBUG] 창원/김해 단지 수 확인 — 검색 누락 원인 진단용
  const [changwonCount, gimhaeCount] = await Promise.all([
    prisma.apartmentComplex.count({ where: { city: { contains: "창원" } } }),
    prisma.apartmentComplex.count({ where: { city: { contains: "김해" } } }),
  ]);
  console.log(`[DEBUG] ApartmentComplex 창원: ${changwonCount}건 / 김해: ${gimhaeCount}건`);

  // 최근 30일 취소이력 있는 단지 ID 목록
  const warningLogs = await prisma.cancellationLog.findMany({
    where: { detectedAt: { gte: thirtyDaysAgo } },
    select: { complexId: true },
    distinct: ["complexId"],
  });
  const warningComplexIds = warningLogs.map((l) => l.complexId);
  const warningSet = new Set(warningComplexIds);

  // DB 내 가장 최근 계약일 조회 (신고 지연으로 오늘 데이터 없는 경우 대응)
  const latestTxRow = await prisma.transaction.findFirst({
    where: { cancelFlag: false },
    orderBy: { contractDate: "desc" },
    select: { contractDate: true },
  });
  const latestTransactionDate = latestTxRow?.contractDate ?? null;
  const latestDateRange = latestTransactionDate ? getDateRange(latestTransactionDate) : null;

  // 최근 거래일 최고가 거래 (King of the Day)
  const latestTopTx = latestDateRange
    ? await prisma.transaction.findFirst({
      where: { contractDate: latestDateRange, cancelFlag: false },
      orderBy: { priceManwon: "desc" },
      include: { complex: true },
    })
    : null;

  let kingOfDay: KingOfDayData | null = null;
  if (latestTopTx) {
    const prevRecord = await prisma.recordHighPrice.findUnique({
      where: {
        complexId_areaPyeong: {
          complexId: latestTopTx.complexId,
          areaPyeong: latestTopTx.areaPyeong,
        },
      },
    });

    kingOfDay = {
      complexId: latestTopTx.complexId,
      complexName: latestTopTx.complex.name,
      dong: latestTopTx.complex.dong,
      city: latestTopTx.complex.city,
      areaPyeong: latestTopTx.areaPyeong,
      priceManwon: latestTopTx.priceManwon,
      floor: latestTopTx.floor,
      contractDate: latestTopTx.contractDate.toISOString(),
      directDeal: latestTopTx.directDeal,
      previousRecordPrice: prevRecord?.previousPrice ?? null,
      priceDelta:
        prevRecord?.previousPrice != null
          ? latestTopTx.priceManwon - prevRecord.previousPrice
          : null,
      hasWarning: warningSet.has(latestTopTx.complexId),
    };
  }

  // 최근 갱신된 신고가 — 복합 스코어 정렬: 상승률 × log(세대수) × 신선도
  const ninetyDaysAgo = getDaysAgoDate(90);
  let pool = await prisma.recordHighPrice.findMany({
    where: { recordSetAt: { gte: ninetyDaysAgo } },
    take: 80,
    include: { complex: true },
  });
  // 90일치 풀이 너무 적으면 전체 최신순 폴백
  if (pool.length < 5) {
    pool = await prisma.recordHighPrice.findMany({
      orderBy: { recordSetAt: "desc" },
      take: 60,
      include: { complex: true },
    });
  }

  const now = Date.now();
  const scored = pool.map((rh) => {
    const priceDelta = rh.previousPrice != null ? rh.currentPrice - rh.previousPrice : 0;
    const deltaPercent =
      rh.previousPrice != null && rh.previousPrice > 0
        ? Math.round((priceDelta / rh.previousPrice) * 1000) / 10
        : 0;
    const households = rh.complex.totalHouseholds ?? 10;
    const daysSince = (now - rh.recordSetAt.getTime()) / 86_400_000;
    // 신선도 가중치: 오늘=1.0, 30일후≈0.37 (자연감쇄)
    const freshness = Math.exp(-daysSince / 30);
    const compositeScore = Math.abs(deltaPercent) * Math.log(Math.max(households, 10)) * freshness;
    return { rh, priceDelta, deltaPercent, compositeScore };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const recordBreakers: RecordBreakerItem[] = scored.slice(0, 15).map(({ rh, priceDelta, deltaPercent }) => ({
    complexId: rh.complexId,
    complexName: rh.complex.name,
    dong: rh.complex.dong,
    areaPyeong: rh.areaPyeong,
    newPrice: rh.currentPrice,
    previousPrice: rh.previousPrice ?? 0,
    priceDelta,
    deltaPercent,
    contractDate: rh.recordSetAt.toISOString(),
    directDeal: false,
    hasWarning: warningSet.has(rh.complexId),
  }));

  // 통계 — 최근 거래일 기준 + 취소는 최근 7일 감지 기준
  const [latestTxCount, latestRecordCount, recentCancelCount, totalComplexCount] =
    await Promise.all([
      latestDateRange
        ? prisma.transaction.count({
          where: { contractDate: latestDateRange, cancelFlag: false },
        })
        : Promise.resolve(0),
      latestDateRange
        ? prisma.recordHighHistory.count({
          where: { contractDate: latestDateRange, eventType: "NEW_RECORD" },
        })
        : Promise.resolve(0),
      prisma.cancellationLog.count({
        where: { detectedAt: { gte: sevenDaysAgo } },
      }),
      prisma.apartmentComplex.count(),
    ]);

  return {
    kingOfDay,
    recordBreakers,
    stats: {
      todayTransactionCount: latestTxCount,
      todayNewRecordCount: latestRecordCount,
      todayCancellationCount: recentCancelCount,
      totalComplexCount,
    },
    latestTransactionDate: latestTransactionDate?.toISOString() ?? null,
    warningComplexIds,
  };
}
