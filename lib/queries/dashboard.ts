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

  // 최근 갱신된 신고가 — RecordHighPrice를 recordSetAt 최신순으로 15개
  const latestRecordHighs = await prisma.recordHighPrice.findMany({
    orderBy: { recordSetAt: "desc" },
    take: 15,
    include: { complex: true },
  });

  const recordBreakers: RecordBreakerItem[] = latestRecordHighs.map((rh) => {
    const priceDelta = rh.previousPrice != null ? rh.currentPrice - rh.previousPrice : 0;
    const deltaPercent =
      rh.previousPrice != null && rh.previousPrice > 0
        ? Math.round((priceDelta / rh.previousPrice) * 1000) / 10
        : 0;
    return {
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
    };
  });

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
