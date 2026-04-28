import { prisma } from "@/lib/db";
import { fetchMolitTransactions } from "@/lib/molit/client";
import { normalizeAll } from "@/lib/molit/normalizer";
import { checkAndUpdateRecordHigh } from "@/lib/ingest/recordHighLogic";
import { handleCancellation } from "@/lib/ingest/cancellationLogic";
import type { IngestResponse } from "@/types/api";

export type IngestSummary = IngestResponse["summary"];

export async function runIngestPipeline(
  lawdCd: string,
  dealYear: number,
  dealMonth: number,
): Promise<IngestSummary> {
  const period = `${dealYear}-${String(dealMonth).padStart(2, "0")}`;
  const summary: IngestSummary = {
    lawdCd,
    period,
    inserted: 0,
    updated: 0,
    cancelled: 0,
    newRecordHighs: 0,
    errors: [],
  };

  // ── 1. MOLIT API 호출 및 정규화 ─────────────────────────────────
  const raws = await fetchMolitTransactions(lawdCd, dealYear, dealMonth);
  const normalized = normalizeAll(raws);

  // ── 2. 건별 트랜잭션 처리 ─────────────────────────────────────────
  for (const n of normalized) {
    try {
      await prisma.$transaction(async (tx) => {
        // 2-a. ApartmentComplex 조회 or 생성
        let complex = await tx.apartmentComplex.findFirst({
          where: { name: n.aptName, dong: n.umdNm, city: n.city },
        });
        if (!complex) {
          complex = await tx.apartmentComplex.create({
            data: {
              name: n.aptName,
              nameChosung: n.nameChosung,
              city: n.city,
              district: n.district,
              dong: n.umdNm,
            },
          });
        }

        // 2-b. 중복 거래 확인 (단지+면적+층+계약일+가격)
        const existing = await tx.transaction.findFirst({
          where: {
            complexId: complex.id,
            areaPyeong: n.areaPyeong,
            floor: n.floor,
            contractDate: n.contractDate,
            priceManwon: n.priceManwon,
          },
        });

        if (existing) {
          // 취소 플래그가 새로 세워진 경우만 업데이트
          if (!existing.cancelFlag && n.cancelFlag) {
            await tx.transaction.update({
              where: { id: existing.id },
              data: { cancelFlag: true },
            });
            summary.updated++;
          }
          if (n.cancelFlag) {
            await handleCancellation(tx, {
              complexId: complex.id,
              areaPyeong: n.areaPyeong,
              cancelledTxId: existing.id,
              cancelledPrice: n.priceManwon,
            });
            summary.cancelled++;
          }
          return;
        }

        // 2-c. 신규 거래 저장
        const newTx = await tx.transaction.create({
          data: {
            complexId: complex.id,
            areaRaw: n.areaRaw,
            areaPyeong: n.areaPyeong,
            floor: n.floor,
            priceManwon: n.priceManwon,
            contractYear: n.contractYear,
            contractMonth: n.contractMonth,
            contractDay: n.contractDay,
            contractDate: n.contractDate,
            registeredDate: n.registeredDate,
            cancelFlag: n.cancelFlag,
            directDeal: n.directDeal,
            rawData: n.rawData as object,
          },
        });
        summary.inserted++;

        if (n.cancelFlag) {
          // 신규이면서 이미 취소 상태 (과거 취소분 소급 수집)
          await handleCancellation(tx, {
            complexId: complex.id,
            areaPyeong: n.areaPyeong,
            cancelledTxId: newTx.id,
            cancelledPrice: n.priceManwon,
          });
          summary.cancelled++;
          return;
        }

        // 2-d. 신고가 판별
        const isNewRecord = await checkAndUpdateRecordHigh(tx, {
          complexId: complex.id,
          areaPyeong: n.areaPyeong,
          newPrice: n.priceManwon,
          newTxId: newTx.id,
          contractDate: n.contractDate,
        });
        if (isNewRecord) summary.newRecordHighs++;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`[${n.aptName} ${n.areaPyeong}평] ${msg}`);
    }
  }

  return summary;
}
