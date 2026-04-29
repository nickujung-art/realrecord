// 85000 → "8억 5,000만원"
// 130000 → "13억"
// 5000 → "5,000만원"
export function formatManwon(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const remainder = manwon % 10000;

  if (eok > 0 && remainder > 0) {
    return `${eok}억 ${remainder.toLocaleString("ko-KR")}만원`;
  }
  if (eok > 0) {
    return `${eok}억`;
  }
  return `${manwon.toLocaleString("ko-KR")}만원`;
}

// 카드 등 짧게 표시할 때: 85000 → "8.5억", 130000 → "13억"
export function formatManwonShort(manwon: number): string {
  const eok = manwon / 10000;
  if (eok >= 1) {
    const rounded = Math.round(eok * 10) / 10;
    return `${rounded}억`;
  }
  return `${manwon.toLocaleString("ko-KR")}만원`;
}

// 델타: +8500 → "+8,500만원", -3000 → "-3,000만원"
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  const abs = Math.abs(delta);
  const eok = Math.floor(abs / 10000);
  const remainder = abs % 10000;

  let formatted: string;
  if (eok > 0 && remainder > 0) {
    formatted = `${eok}억 ${remainder.toLocaleString("ko-KR")}만원`;
  } else if (eok > 0) {
    formatted = `${eok}억`;
  } else {
    formatted = `${abs.toLocaleString("ko-KR")}만원`;
  }

  return `${sign}${delta < 0 ? "-" : ""}${formatted}`;
}

// 퍼센트: 12.345 → "+12.3%"
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

// 평형 표시: 26 → "84㎡ (26평)"
export function formatAreaDisplay(pyeong: number): string {
  const sqm = Math.round(pyeong * 3.305785);
  return `${sqm}㎡ (${pyeong}평)`;
}

// 지도 마커 전용 초간략 표기 (가독성 최우선)
// 85000 → "8.5억", 130000 → "13억", 9500 → "9,500만", 500 → "500만"
export function formatMapPrice(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    // 소수점 1자리까지만, 불필요한 .0은 제거 (13.0억 → 13억)
    const rounded = Math.round(eok * 10) / 10;
    return `${rounded}억`;
  }
  return `${manwon.toLocaleString("ko-KR")}만`;
}
