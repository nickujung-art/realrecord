const CHOSUNG_LIST = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ",
  "ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
];

const HANGUL_START = 0xAC00;  // '가'
const CHOSUNG_STEP = 588;     // 21 * 28

// 한글 문자열에서 초성만 추출: "창원 더샵" → "ㅊㅇ ㄷㅅ"
export function extractChosung(str: string): string {
  return str
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= HANGUL_START && code <= 0xD7A3) {
        return CHOSUNG_LIST[Math.floor((code - HANGUL_START) / CHOSUNG_STEP)];
      }
      return ch;
    })
    .join("");
}

// 입력이 모두 초성 자모(ㄱ-ㅎ)인지 판별
export function isChosungOnly(str: string): boolean {
  return str.split("").every((ch) => {
    const code = ch.charCodeAt(0);
    return (code >= 0x3131 && code <= 0x314E) || ch === " ";
  });
}

// 검색 쿼리 빌더: 초성/일반 검색 모두 커버하는 LIKE 패턴 반환
export function buildSearchPattern(query: string): {
  namePattern: string;
  chosungPattern: string;
  useChosung: boolean;
} {
  const trimmed = query.trim();
  const useChosung = isChosungOnly(trimmed);

  return {
    namePattern: `%${trimmed}%`,
    chosungPattern: `%${extractChosung(trimmed)}%`,
    useChosung,
  };
}
