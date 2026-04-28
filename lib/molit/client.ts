import type { MolitRawTransaction, MolitApiResponse } from "@/types/molit";

const PAGE_SIZE = 1000;

export async function fetchMolitTransactions(
  lawdCd: string,
  dealYear: number,
  dealMonth: number
): Promise<MolitRawTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  const baseUrl = process.env.MOLIT_API_BASE_URL;
  if (!apiKey || !baseUrl) throw new Error("MOLIT_API_KEY / MOLIT_API_BASE_URL not set");

  const dealYmd = `${dealYear}${String(dealMonth).padStart(2, "0")}`;
  const all: MolitRawTransaction[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      numOfRows: String(PAGE_SIZE),
      pageNo: String(page),
      _type: "json",
    });

    const res = await fetch(`${baseUrl}?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`MOLIT HTTP ${res.status} ${res.statusText}`);

    const data: MolitApiResponse = await res.json();
    const { resultCode, resultMsg } = data.response.header;
    // 공공데이터포털 성공 코드: "00", "000", "0000" 모두 0으로만 구성
    if (!/^0+$/.test(resultCode)) throw new Error(`MOLIT API ${resultCode}: ${resultMsg}`);

    const { totalCount, items } = data.response.body;
    // items가 "" (빈 문자열)이면 결과 없음
    if (totalCount === 0 || typeof items !== "object" || !items.item) break;

    // 단건 응답 시 배열이 아닌 객체로 옴 — 정규화
    const batch = Array.isArray(items.item) ? items.item : [items.item];
    all.push(...batch);

    if (all.length >= totalCount) break;
    page++;
  }

  return all;
}
