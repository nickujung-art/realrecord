// ─── Dashboard ───────────────────────────────────────────────────
export interface KingOfDayData {
  complexId: string;
  complexName: string;
  dong: string;
  city: string;
  areaPyeong: number;
  priceManwon: number;
  floor: number;
  contractDate: string;     // ISO string
  directDeal: boolean;
  previousRecordPrice: number | null;
  priceDelta: number | null;
  hasWarning: boolean;
}

export interface RecordBreakerItem {
  complexId: string;
  complexName: string;
  dong: string;
  areaPyeong: number;
  newPrice: number;
  previousPrice: number;
  priceDelta: number;
  deltaPercent: number;
  contractDate: string;     // ISO string
  directDeal: boolean;
  hasWarning: boolean;
}

export interface DashboardStats {
  todayTransactionCount: number;
  todayNewRecordCount: number;
  todayCancellationCount: number;
  totalComplexCount: number;
}

export interface DashboardResponse {
  kingOfDay: KingOfDayData | null;
  recordBreakers: RecordBreakerItem[];
  stats: DashboardStats;
  warningComplexIds: string[];
  latestTransactionDate: string | null;  // ISO string — 최근 계약일 (신고 지연 대응)
}

// ─── Search ──────────────────────────────────────────────────────
export interface SearchResultItem {
  id: string;
  name: string;
  dong: string;
  city: string;
  district: string;
  latestRecordPrice: number | null;
  topAreaPyeong: number | null;
  hasRecentCancellation: boolean;
  transactionCount: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
}

// ─── Apartment Detail ─────────────────────────────────────────────
export interface ListingStatsData {
  saleCount: number;
  rentCount: number;
  saleDiffPercentage: number | null; // null = 비교 레코드 없음 (데이터 1건 이하)
}

export interface AreaRecordHigh {
  areaPyeong: number;
  currentPrice: number;
  previousPrice: number | null;
  recordSetAt: string;      // ISO string
  directDeal: boolean;
}

export interface TransactionSummary {
  id: string;
  priceManwon: number;
  areaPyeong: number;
  floor: number;
  contractDate: string;
  cancelFlag: boolean;
  directDeal: boolean;
}

export interface PriceHistoryPoint {
  contractDate: string;     // "YYYY-MM-DD" for Recharts XAxis
  priceManwon: number;
  areaPyeong: number;
  floor: number;
  cancelled: boolean;
}

export interface AdvertiserSummary {
  id: string;
  name: string;
  phone: string | null;
  linkUrl: string | null;
}

export interface MaintenanceFeeData {
  yearMonth: string;       // "202312"
  communalFeeWon: number;
  indivFeeWon: number;
  totalFeeWon: number;
}

export interface SchoolInfoSummary {
  id: string;
  schoolName: string;
  schoolType: string;      // "공립" | "사립" | "국립"
  schoolLevel: "초등학교" | "중학교" | "고등학교" | null;
  address: string | null;
  distance: number;        // 직선거리 (미터)
  grade: string;           // "상" | "중" | "하"
  schoolUrl: string | null;
  isEstimated: boolean;    // 좌표 없이 동 이름으로 추정한 거리 — true면 신뢰도 낮음
}

export interface ApartmentDetailResponse {
  complex: {
    id: string;
    name: string;
    city: string;
    district: string;
    dong: string;
    roadAddress: string | null;
    hasRecentCancellation: boolean;
    naverHscpNo: string | null;
    kbComplexNo: string | null;
    kaptCode: string | null;
    parkingCount: number | null;
    parkingCountGround: number | null;
    parkingCountUnderground: number | null;
    elevatorCount: number | null;
    heatingMethod: string | null;
    hallwayType: string | null;
    totalHouseholds: number | null;
    maintenanceAreaSum: number | null;
    cctvCount: number | null;
    hasGym: boolean | null;
    hasLibrary: boolean | null;
    hasDaycare: boolean | null;
    hasSeniorCenter: boolean | null;
    hasPlayground: boolean | null;
  };
  recordHighs: AreaRecordHigh[];
  recentTransactions: TransactionSummary[];
  priceHistory: PriceHistoryPoint[];
  cancellationCount: number;
  advertisers: AdvertiserSummary[];
  gapPrice: number | null;       // 매매가 - 전세가 (만원). RentRecord 데이터 없으면 null
  listingStats: ListingStatsData | null;
  schoolInfos: SchoolInfoSummary[];
  maintenanceFees: MaintenanceFeeData[];   // 최근 12개월, yearMonth 내림차순
}

// ─── Ingest ───────────────────────────────────────────────────────
export interface IngestRequest {
  lawdCd: string;
  dealYear: number;
  dealMonth: number;
}

export interface IngestResponse {
  success: boolean;
  summary: {
    lawdCd: string;
    period: string;
    inserted: number;
    updated: number;
    cancelled: number;
    newRecordHighs: number;
    errors: string[];
  };
}
