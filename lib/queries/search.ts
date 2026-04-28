import { prisma } from "@/lib/db";
import { buildSearchPattern } from "@/lib/utils/chosung";
import { getDaysAgoDate } from "@/lib/utils/dateUtils";
import type { SearchResponse, SearchResultItem } from "@/types/api";

export async function searchComplexes(
  query: string,
  limit = 20
): Promise<SearchResponse> {
  const { namePattern, chosungPattern } = buildSearchPattern(query);
  const thirtyDaysAgo = getDaysAgoDate(30);

  const complexes = await prisma.apartmentComplex.findMany({
    where: {
      OR: [
        { name: { contains: query.trim() } },
        { nameChosung: { contains: chosungPattern.replace(/%/g, "") } },
        { dong: { contains: query.trim() } },
        { city: { contains: query.trim() } },
      ],
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    include: {
      recordHighs: {
        orderBy: { currentPrice: "desc" },
        take: 1,
      },
      _count: { select: { transactions: true } },
    },
  });

  // 취소 이력 있는 단지 ID 조회
  const warningLogs = await prisma.cancellationLog.findMany({
    where: {
      detectedAt: { gte: thirtyDaysAgo },
      complexId: { in: complexes.map((c) => c.id) },
    },
    select: { complexId: true },
    distinct: ["complexId"],
  });
  const warningSet = new Set(warningLogs.map((l) => l.complexId));

  const results: SearchResultItem[] = complexes.map((c) => ({
    id: c.id,
    name: c.name,
    dong: c.dong,
    city: c.city,
    district: c.district,
    latestRecordPrice: c.recordHighs[0]?.currentPrice ?? null,
    topAreaPyeong: c.recordHighs[0]?.areaPyeong ?? null,
    hasRecentCancellation: warningSet.has(c.id),
    transactionCount: c._count.transactions,
  }));

  return {
    results,
    total: results.length,
    query,
  };
}
