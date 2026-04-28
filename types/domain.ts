export interface ApartmentComplex {
  id: string;
  name: string;
  nameChosung: string;
  city: string;
  district: string;
  dong: string;
  roadAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  complexId: string;
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
  rawData: Record<string, unknown>;
  ingestedAt: Date;
}

export interface RecordHighPrice {
  id: string;
  complexId: string;
  areaPyeong: number;
  currentPrice: number;
  currentTxId: string;
  previousPrice: number | null;
  previousTxId: string | null;
  recordSetAt: Date;
  updatedAt: Date;
}

export type RecordHighEventType = "NEW_RECORD" | "REVERTED" | "RESTORED";

export interface RecordHighHistory {
  id: string;
  recordHighId: string;
  eventType: RecordHighEventType;
  newPrice: number;
  previousPrice: number | null;
  transactionId: string;
  contractDate: Date;
  priceDelta: number | null;
  deltaPercent: number | null;
  occurredAt: Date;
}

export interface CancellationLog {
  id: string;
  complexId: string;
  areaPyeong: number;
  cancelledTxId: string;
  cancelledPrice: number;
  revertedToPrice: number | null;
  revertedToTxId: string | null;
  wasRecordHigh: boolean;
  detectedAt: Date;
}
