import type { MolitRawTransaction } from "@/types/molit";
import { toContractDate } from "@/lib/utils/dateUtils";
import { extractChosung } from "@/lib/utils/chosung";

// 시군구코드(sggCd) → 행정구역 매핑
// 창원시는 통합 코드(48240)로만 조회됨; 구별 코드는 응답 내 sggCd로 분기 가능
export const SGG_MAP: Record<number, { city: string; district: string }> = {
  48240: { city: "창원시", district: "창원시" },
  48245: { city: "창원시", district: "의창구" },
  48247: { city: "창원시", district: "성산구" },
  48249: { city: "창원시", district: "마산합포구" },
  48251: { city: "창원시", district: "마산회원구" },
  48253: { city: "창원시", district: "진해구" },
  48250: { city: "김해시", district: "김해시" },
};

export interface NormalizedTransaction {
  // ApartmentComplex 조회/생성 키
  aptName: string;
  lawdCd: string;       // String(sggCd)
  umdNm: string;        // 읍면동명 → complex.dong
  city: string;
  district: string;
  nameChosung: string;

  // Transaction 저장 필드
  areaRaw: string;
  areaPyeong: number;
  floor: number;
  priceManwon: number;
  contractYear: number;
  contractMonth: number;
  contractDay: number;
  contractDate: Date;
  registeredDate: Date | null;
  cancelFlag: boolean;
  directDeal: boolean;

  rawData: MolitRawTransaction;
}

export function normalizeTransaction(raw: MolitRawTransaction): NormalizedTransaction {
  const priceManwon = parseInt(raw.dealAmount.replace(/,/g, "").trim(), 10);

  // excluUseAr는 이미 number
  const areaRaw = String(raw.excluUseAr);
  const areaPyeong = Math.round(raw.excluUseAr / 3.305785);

  const contractYear = raw.dealYear;
  const contractMonth = raw.dealMonth;
  const contractDay = raw.dealDay;
  const contractDate = toContractDate(contractYear, contractMonth, contractDay);

  // rgstDate: "25.03.14" → 2025-03-14
  let registeredDate: Date | null = null;
  const rgst = raw.rgstDate?.trim();
  if (rgst && rgst.includes(".")) {
    const parts = rgst.split(".");
    if (parts.length === 3) {
      const fullYear = parseInt(parts[0]) + 2000;
      registeredDate = toContractDate(fullYear, parseInt(parts[1]), parseInt(parts[2]));
    }
  }

  const sggCd = raw.sggCd;
  const location = SGG_MAP[sggCd] ?? { city: "알수없음", district: "알수없음" };
  const aptName = raw.aptNm.trim();

  // 해제거래: cdealType이 공백이 아니거나 cdealDay에 날짜가 있는 경우
  const cancelFlag = raw.cdealType.trim() !== "" || raw.cdealDay.trim() !== "";
  const directDeal = raw.dealingGbn?.trim() === "직거래";

  return {
    aptName,
    lawdCd: String(sggCd),
    umdNm: raw.umdNm.trim(),
    city: location.city,
    district: location.district,
    nameChosung: extractChosung(aptName),
    areaRaw,
    areaPyeong,
    floor: raw.floor,
    priceManwon,
    contractYear,
    contractMonth,
    contractDay,
    contractDate,
    registeredDate,
    cancelFlag,
    directDeal,
    rawData: raw,
  };
}

export function normalizeAll(raws: MolitRawTransaction[]): NormalizedTransaction[] {
  return raws
    .map(normalizeTransaction)
    .filter(
      (t) =>
        !isNaN(t.priceManwon) &&
        t.priceManwon > 0 &&
        !isNaN(t.areaPyeong) &&
        t.areaPyeong > 0 &&
        t.aptName.length > 0,
    );
}
