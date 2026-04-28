import type { PrismaClient } from "@/app/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

interface CancellationInput {
  complexId: string;
  areaPyeong: number;
  cancelledTxId: string;
  cancelledPrice: number;
}

/**
 * 취소 거래 처리:
 *  1. 취소된 거래가 현재 신고가인지 확인
 *  2. 신고가라면 RecordHighHistory를 역추적해 직전 최고가로 롤백
 *  3. CancellationLog에 이력 기록
 */
export async function handleCancellation(
  tx: Tx,
  input: CancellationInput,
): Promise<void> {
  const { complexId, areaPyeong, cancelledTxId, cancelledPrice } = input;

  const record = await tx.recordHighPrice.findUnique({
    where: { complexId_areaPyeong: { complexId, areaPyeong } },
  });

  const wasRecordHigh = record?.currentTxId === cancelledTxId;
  let revertedToPrice: number | null = null;
  let revertedToTxId: string | null = null;

  if (wasRecordHigh && record) {
    // RecordHighHistory에서 취소된 거래 이전의 마지막 신고가 이벤트를 찾는다
    const prevHistory = await tx.recordHighHistory.findFirst({
      where: {
        recordHighId: record.id,
        transactionId: { not: cancelledTxId },
      },
      orderBy: { occurredAt: "desc" },
    });

    if (prevHistory) {
      revertedToPrice = prevHistory.newPrice;
      revertedToTxId = prevHistory.transactionId;

      await tx.recordHighPrice.update({
        where: { id: record.id },
        data: {
          currentPrice: prevHistory.newPrice,
          currentTxId: prevHistory.transactionId,
          previousPrice: cancelledPrice,
          previousTxId: cancelledTxId,
          recordSetAt: prevHistory.contractDate,
        },
      });

      await tx.recordHighHistory.create({
        data: {
          recordHighId: record.id,
          eventType: "REVERTED",
          newPrice: prevHistory.newPrice,
          previousPrice: cancelledPrice,
          transactionId: cancelledTxId,
          contractDate: prevHistory.contractDate,
          priceDelta: prevHistory.newPrice - cancelledPrice,
          deltaPercent:
            ((prevHistory.newPrice - cancelledPrice) / cancelledPrice) * 100,
        },
      });
    } else {
      // 롤백할 이전 기록이 없는 경우 — 최초 신고가였으므로 레코드를 삭제하지 않고
      // currentPrice를 0으로 표시하는 대신 이력만 남긴다
      await tx.recordHighHistory.create({
        data: {
          recordHighId: record.id,
          eventType: "REVERTED",
          newPrice: 0,
          previousPrice: cancelledPrice,
          transactionId: cancelledTxId,
          contractDate: record.recordSetAt,
          priceDelta: -cancelledPrice,
          deltaPercent: -100,
        },
      });
    }
  }

  await tx.cancellationLog.create({
    data: {
      complexId,
      areaPyeong,
      cancelledTxId,
      cancelledPrice,
      revertedToPrice,
      revertedToTxId,
      wasRecordHigh,
    },
  });
}
