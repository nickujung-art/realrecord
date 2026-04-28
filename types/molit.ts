// 공공데이터포털 아파트매매 실거래 상세 자료 API (_type=json) 실제 응답 shape
export interface MolitRawTransaction {
  aptNm: string;          // "송보파인빌" 단지명
  aptSeq: string;         // "48240-125" 단지 시퀀스
  umdNm: string;          // "정동면 풍정리" 읍면동명
  excluUseAr: number;     // 84.6256 전용면적 ㎡ (이미 number)
  floor: number;          // 6 층 (이미 number)
  dealAmount: string;     // "12,300" 거래금액 만원 (쉼표 포함)
  dealYear: number;       // 2024
  dealMonth: number;      // 12
  dealDay: number;        // 19
  rgstDate: string;       // "25.03.14" 신고일 YY.MM.DD
  sggCd: number;          // 48240 시군구코드
  cdealType: string;      // " " = 정상, non-empty = 해제거래
  cdealDay: string;       // " " = 정상, "DD" = 해제일
  dealingGbn: string;     // "직거래" | "중개거래"
  // 기타 부가 필드
  buildYear?: number;
  buyerGbn?: string;
  slerGbn?: string;
  roadNm?: string;
  jibun?: number;
  bonbun?: string;
  bubun?: string;
}

export interface MolitApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      // MOLIT API: 데이터 없을 때 "" (빈 문자열), 있을 때 { item: T | T[] }
      items: "" | { item: MolitRawTransaction | MolitRawTransaction[] };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}
