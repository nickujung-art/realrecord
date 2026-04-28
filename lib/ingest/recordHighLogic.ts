import type { PrismaClient } from "@/app/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

interface RecordHighInput {
  complexId: string;
  areaPyeong: number;
  newPrice: number;
  newTxId: string;
  contractDate: Date;
}

/**
 * 신규 거래가 역대 최고가인지 확인하고, 맞으면 RecordHighPrice·RecordHighHistory를 갱신한다.
 * 반환값: 신고가 경신 여부
 */
export async function checkAndUpdateRecordHigh(
  tx: Tx,
  input: RecordHighInput,
): Promise<boolean> {
  const { complexId, areaPyeong, newPrice, newTxId, contractDate } = input;

  const existing = await tx.recordHighPrice.findUnique({
    where: { complexId_areaPyeong: { complexId, areaPyeong } },
  });

  // 현재 신고가 이하면 아무 작업 없음
  if (existing && existing.currentPrice >= newPrice) return false;

  const priceDelta = existing ? newPrice - existing.currentPrice : null;
  const deltaPercent =
    existing && priceDelta != null
      ? (priceDelta / existing.currentPrice) * 100
      : null;

  // RecordHighPrice upsert
  const record = await tx.recordHighPrice.upsert({
    where: { complexId_areaPyeong: { complexId, areaPyeong } },
    create: {
      complexId,
      areaPyeong,
      currentPrice: newPrice,
      currentTxId: newTxId,
      recordSetAt: contractDate,
    },
    update: {
      previousPrice: existing?.currentPrice ?? null,
      previousTxId: existing?.currentTxId ?? null,
      currentPrice: newPrice,
      currentTxId: newTxId,
      recordSetAt: contractDate,
    },
  });

  // 이력 기록
  await tx.recordHighHistory.create({
    data: {
      recordHighId: record.id,
      eventType: existing ? "NEW_RECORD" : "NEW_RECORD",
      newPrice,
      previousPrice: existing?.currentPrice ?? null,
      transactionId: newTxId,
      contractDate,
      priceDelta,
      deltaPercent,
    },
  });

  return true;
}
