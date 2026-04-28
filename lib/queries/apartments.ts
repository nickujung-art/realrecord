import { prisma } from "@/lib/db";
import { getDaysAgoDate, toDateString } from "@/lib/utils/dateUtils";
import type {
  ApartmentDetailResponse,
  AdvertiserSummary,
  ListingStatsData,
  SchoolInfoSummary,
  MaintenanceFeeData,
} from "@/types/api";

export async function getApartmentDetail(
  id: string,
  pyeong?: number
): Promise<ApartmentDetailResponse | null> {
  const thirtyDaysAgo = getDaysAgoDate(30);

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    include: {
      recordHighs: {
        orderBy: { areaPyeong: "asc" },
      },
    },
  });
  if (!complex) return null;

  // All independent queries in a single round-trip
  const [recentTxs, cancellationCount, priceHistoryTxs, advertiserLinks, rawListingStats, rawSchoolInfos, rawFees] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { complexId: id },
        orderBy: { contractDate: "desc" },
        take: 20,
      }),
      prisma.cancellationLog.count({
        where: { complexId: id, detectedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.transaction.findMany({
        where: { complexId: id },
        orderBy: { contractDate: "asc" },
        select: {
          contractDate: true,
          priceManwon: true,
          areaPyeong: true,
          floor: true,
          cancelFlag: true,
        },
      }),
      prisma.apartmentAdvertiser.findMany({
        where: { complexId: id, advertiser: { isActive: true } },
        include: {
          advertiser: { select: { id: true, name: true, phone: true, linkUrl: true } },
        },
      }),
      // 최신 2건: 최신 vs 직전 비교로 증감률 계산
      prisma.listingStats.findMany({
        where: { complexId: id },
        orderBy: { date: "desc" },
        take: 2,
        select: { saleCount: true, rentCount: true },
      }),
      // 학교 정보: 지오코딩된 신뢰도 높은 데이터만 (초/중/고 1개씩 추출용)
      // isEstimated=true는 좌표 없이 동 이름으로 추정한 것 → 표시하지 않음
      prisma.schoolInfo.findMany({
        where: { complexId: id, isEstimated: false },
        orderBy: { distance: "asc" },
      }),
      // 관리비: 최근 12개월 (yearMonth 내림차순)
      prisma.maintenanceFee.findMany({
        where: { complexId: id },
        orderBy: { yearMonth: "desc" },
        take: 12,
        select: { yearMonth: true, communalFeeWon: true, indivFeeWon: true, totalFeeWon: true },
      }),
    ]);

  // Gap price: latest sale minus latest rent for the requested pyeong
  let gapPrice: number | null = null;
  if (pyeong) {
    const [latestSale, latestRent] = await Promise.all([
      prisma.transaction.findFirst({
        where: { complexId: id, areaPyeong: pyeong, cancelFlag: false },
        orderBy: { contractDate: "desc" },
        select: { priceManwon: true },
      }),
      prisma.rentRecord.findFirst({
        where: { complexId: id, areaPyeong: pyeong },
        orderBy: { contractDate: "desc" },
        select: { priceManwon: true },
      }),
    ]);
    if (latestSale && latestRent) {
      gapPrice = latestSale.priceManwon - latestRent.priceManwon;
    }
  }

  // ListingStats: compute percentage change between the two most recent snapshots
  let listingStats: ListingStatsData | null = null;
  if (rawListingStats.length > 0) {
    const latest = rawListingStats[0];
    const prev = rawListingStats[1];
    const saleDiffPercentage =
      prev && prev.saleCount > 0
        ? Math.round(((latest.saleCount - prev.saleCount) / prev.saleCount) * 1000) / 10
        : null;
    listingStats = {
      saleCount: latest.saleCount,
      rentCount: latest.rentCount,
      saleDiffPercentage,
    };
  }

  // 학교 수준 감지 헬퍼
  function getSchoolLevel(name: string): "초등학교" | "중학교" | "고등학교" | null {
    if (name.includes("초등학교")) return "초등학교";
    if (name.includes("중학교")) return "중학교";
    if (name.includes("고등학교")) return "고등학교";
    return null;
  }

  // 초/중/고 각 1개씩 (이미 거리순 정렬이므로 첫 번째가 가장 가까운 것)
  const schoolByLevel = new Map<string, typeof rawSchoolInfos[0]>();
  for (const s of rawSchoolInfos) {
    const level = getSchoolLevel(s.schoolName);
    if (level && !schoolByLevel.has(level)) schoolByLevel.set(level, s);
  }
  const groupedSchools = Array.from(schoolByLevel.values());

  // 학군 데이터 진단 로그 — 서버 콘솔에서 확인 가능
  console.log(
    `[getApartmentDetail] id=${id} name="${complex.name}" ` +
    `lat=${complex.latitude ?? "null"} lng=${complex.longitude ?? "null"} ` +
    `schoolInfos=${rawSchoolInfos.length}개 → 그룹화 ${groupedSchools.length}개`
  );

  return {
    complex: {
      id: complex.id,
      name: complex.name,
      city: complex.city,
      district: complex.district,
      dong: complex.dong,
      roadAddress: complex.roadAddress,
      hasRecentCancellation: cancellationCount > 0,
      naverHscpNo: complex.naverHscpNo ?? null,
      kbComplexNo: complex.kbComplexNo ?? null,
      kaptCode: complex.kaptCode ?? null,
      parkingCount: complex.parkingCount ?? null,
      parkingCountGround: complex.parkingCountGround ?? null,
      parkingCountUnderground: complex.parkingCountUnderground ?? null,
      elevatorCount: complex.elevatorCount ?? null,
      heatingMethod: complex.heatingMethod ?? null,
      hallwayType: complex.hallwayType ?? null,
      totalHouseholds: complex.totalHouseholds ?? null,
      maintenanceAreaSum: complex.maintenanceAreaSum ?? null,
      cctvCount: complex.cctvCount ?? null,
      hasGym: complex.hasGym ?? null,
      hasLibrary: complex.hasLibrary ?? null,
      hasDaycare: complex.hasDaycare ?? null,
      hasSeniorCenter: complex.hasSeniorCenter ?? null,
      hasPlayground: complex.hasPlayground ?? null,
    },
    recordHighs: complex.recordHighs.map((rh) => ({
      areaPyeong: rh.areaPyeong,
      currentPrice: rh.currentPrice,
      previousPrice: rh.previousPrice,
      recordSetAt: rh.recordSetAt.toISOString(),
      directDeal: false,
    })),
    recentTransactions: recentTxs.map((t) => ({
      id: t.id,
      priceManwon: t.priceManwon,
      areaPyeong: t.areaPyeong,
      floor: t.floor,
      contractDate: t.contractDate.toISOString(),
      cancelFlag: t.cancelFlag,
      directDeal: t.directDeal,
    })),
    priceHistory: priceHistoryTxs.map((t) => ({
      contractDate: toDateString(t.contractDate),
      priceManwon: t.priceManwon,
      areaPyeong: t.areaPyeong,
      floor: t.floor,
      cancelled: t.cancelFlag,
    })),
    cancellationCount,
    advertisers: advertiserLinks.map((link): AdvertiserSummary => ({
      id: link.advertiser.id,
      name: link.advertiser.name,
      phone: link.advertiser.phone,
      linkUrl: link.advertiser.linkUrl,
    })),
    gapPrice,
    listingStats,
    schoolInfos: groupedSchools.map((s): SchoolInfoSummary => ({
      id: s.id,
      schoolName: s.schoolName,
      schoolType: s.schoolType,
      schoolLevel: getSchoolLevel(s.schoolName),
      address: s.address,
      distance: s.distance,
      grade: s.grade,
      schoolUrl: s.schoolUrl,
      isEstimated: s.isEstimated,
    })),
    maintenanceFees: rawFees.map((f): MaintenanceFeeData => ({
      yearMonth: f.yearMonth,
      communalFeeWon: f.communalFeeWon,
      indivFeeWon: f.indivFeeWon,
      totalFeeWon: f.totalFeeWon,
    })),
  };
}
