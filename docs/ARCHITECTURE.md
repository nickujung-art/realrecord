# 아키텍처 — 리얼레코드 창부이 데이터랩

## 디렉터리 구조

```
realrecord/
├── app/
│   ├── page.tsx                        # 메인 대시보드 (SSR, force-dynamic)
│   ├── search/page.tsx                 # 검색 페이지
│   ├── apartments/[id]/page.tsx        # 아파트 상세 (Server Component)
│   ├── admin/advertisers/page.tsx      # 광고주 관리 어드민 UI
│   ├── api/
│   │   ├── ingest/route.ts             # MOLIT 인제스트 트리거
│   │   ├── search/route.ts             # 단지 검색 API
│   │   ├── dashboard/route.ts          # 대시보드 데이터 API
│   │   ├── apartments/[id]/route.ts    # 상세 페이지 데이터 API
│   │   └── admin/advertisers/[route]   # 광고주 CRUD API
│   └── generated/prisma/               # Prisma 생성 클라이언트 (커밋됨)
├── components/
│   ├── dashboard/
│   │   ├── DashboardStats.tsx          # 전체 통계 카드
│   │   ├── KingOfDayCard.tsx           # 오늘의 신고가 왕
│   │   ├── RecordBreakerList.tsx       # 신고가 목록 (빈 상태 → Mock TOP 3)
│   │   └── PremiumAgents.tsx           # 프리미엄 광고주 카드
│   ├── search/
│   │   └── SearchBar.tsx               # Live Search (debounce 250ms, 초성 지원)
│   ├── apartment/
│   │   ├── SmartChart.tsx              # [Client] 기간 칩 + AI 아웃라이어 토글
│   │   ├── SummaryCards.tsx            # 실거주자·투자자 패키지 카드
│   │   ├── StickyHeader.tsx            # [Client] 스크롤 200px+ fade-in
│   │   ├── SchoolCard.tsx              # 학군 정보 (NEIS 연동)
│   │   └── InfoSections.tsx            # 관리비 + 시설 정보 (K-APT 연동)
│   └── ui/
│       ├── DirectDealBadge.tsx
│       ├── PriceDelta.tsx
│       ├── SectionHeader.tsx
│       ├── Skeleton.tsx
│       ├── StatCard.tsx
│       └── WarningBadge.tsx            # "거래 알림" 배지 (slate 톤)
├── lib/
│   ├── db.ts                           # Prisma 싱글턴 (PrismaPg)
│   ├── molit/
│   │   ├── client.ts                   # MOLIT API 클라이언트
│   │   └── normalizer.ts               # API 응답 정규화
│   ├── ingest/
│   │   ├── pipeline.ts                 # 인제스트 파이프라인 오케스트레이터
│   │   ├── recordHighLogic.ts          # 신고가 감지 + 갱신 로직
│   │   └── cancellationLogic.ts        # 거래취소 감지 로직
│   ├── queries/
│   │   ├── dashboard.ts                # 대시보드용 집계 쿼리
│   │   ├── apartments.ts               # getApartmentDetail(id, pyeong?)
│   │   └── search.ts                   # 단지 검색 쿼리 (초성 포함)
│   └── utils/
│       ├── chosung.ts                  # 한글 초성 분리/검색
│       ├── dateUtils.ts
│       └── formatPrice.ts
├── scripts/
│   ├── ingest-all.ts                   # 월별 MOLIT 실거래 수집
│   ├── ingest-historical.ts            # 전체 이력 (2016~현재)
│   ├── ingest-repair.ts                # 누락 단지 재수집
│   ├── fix-gu.ts                       # 구(區) 정보 보정
│   ├── map-kb-ids.ts                   # KB부동산 kbComplexNo 매핑 (puppeteer)
│   ├── collect-listings-kb.ts          # KB부동산 매물 수 배치 수집
│   ├── map-kapt-codes.ts               # K-APT kaptCode 매핑
│   ├── fetch-kapt-details.ts           # K-APT 시설+관리비 수집
│   └── fetch-school-data.ts            # NEIS 학교알리미 수집
├── types/
│   ├── api.ts                          # API 응답 타입 전체 (ApartmentDetailResponse 등)
│   └── molit.ts                        # MOLIT API 응답 타입
├── prisma/
│   └── schema.prisma                   # DB 스키마 (14개 모델)
└── logs/                               # 매핑 스크립트 로그 (gitignore)
```

---

## 패턴: Server Component 우선

- **기본값**: Server Component. 데이터 페칭, DB 쿼리 모두 서버에서.
- **Client Component**: 인터랙션이 필요한 경우만 (`"use client"` 명시).
  - `SmartChart.tsx` — 기간 필터, 아웃라이어 토글
  - `StickyHeader.tsx` — 스크롤 이벤트
  - `SearchBar.tsx` — 실시간 검색 debounce

---

## 데이터 흐름

### 아파트 상세 페이지

```
브라우저 요청 → apartments/[id]/page.tsx (Server Component)
  └─ getApartmentDetail(id, pyeong?)    ← lib/queries/apartments.ts
       ├─ complex (naverHscpNo, kbComplexNo, kaptCode, 시설정보)
       ├─ recordHighs (평형별 역대 최고가)
       ├─ recentTransactions (최근 20건)
       ├─ priceHistory (전체, SmartChart용)
       ├─ cancellationCount
       ├─ advertisers
       ├─ gapPrice (매매 - 전세, pyeong 지정 시만 계산)
       ├─ listingStats (최신 2건 → saleDiffPercentage 계산)
       ├─ schoolInfos (거리순 상위 2개)
       └─ maintenanceFees (최근 12개월, yearMonth 내림차순)
  └─ 렌더링 (순서):
       1. StickyHeader (Client)
       2. 단지 헤더 + 역대 최고가 배지
       3. RecommendedAgents
       4. SummaryCards (갭가격 + 포털 CTA)
       5. SchoolCard
       6. MaintenanceFeeSection + FacilityInfoSection (2열)
       7. SmartChart (Client)
       8. 최근 거래 목록
```

### 인제스트 파이프라인

```
MOLIT API → lib/molit/client.ts → normalizer.ts
  → lib/ingest/pipeline.ts
      ├─ Transaction 저장 (upsert)
      ├─ recordHighLogic.ts → RecordHighPrice 갱신 + RecordHighHistory 기록
      └─ cancellationLogic.ts → CancellationLog 기록
```

---

## 상태 관리

- **서버 상태**: Server Component에서 직접 DB 쿼리 (no SWR/React Query)
- **URL 상태**: 평형 선택 → `?pyeong=N` URL param, `<Link scroll={false}>`로 교체
- **클라이언트 상태**: `useState` (기간 칩, 아웃라이어 토글 등 UI 상태만)

### 평형 선택 로직 (chicken-and-egg 해결)

```typescript
// page.tsx
const pyeongFromParam = parseInt(searchParams.pyeong ?? "");
const requestedPyeong = isNaN(pyeongFromParam) ? undefined : pyeongFromParam;
// getApartmentDetail 호출 후
const selectedPyeong = areaCount.has(requestedPyeong) ? requestedPyeong : topAreaPyeong;
//   ↑ UI용 검증값 (존재 확인 후 적용)       ↑ 쿼리용 미검증값 (갭가격 계산)
```

---

## DB 스키마 (Prisma 7 PostgreSQL — 14개 모델)

### ApartmentComplex — 단지 마스터
```
id, name, nameChosung,
kbComplexNo?,        ← KB부동산 단지 번호
naverHscpNo?,        ← 네이버 부동산 단지 번호
kaptCode?,           ← 한국부동산원 K-APT 코드
parkingCount?, elevatorCount?, heatingMethod?, hallwayType?, totalHouseholds?,
city, district, dong, roadAddress?, latitude?, longitude?,
createdAt, updatedAt
인덱스: [city, dong], [nameChosung]
관계: transactions, recordHighs, advertisers, rentRecords,
      listingStats, schoolInfos, maintenanceFees
```

### Transaction — MOLIT 실거래 (매매 전용)
```
id, complexId(FK), areaRaw, areaPyeong(Float·버킷), floor,
priceManwon, contractYear/Month/Day, contractDate,
registeredDate?, cancelFlag, directDeal, rawData(JSON), ingestedAt
인덱스: [complexId, areaPyeong], [contractDate], [cancelFlag]
```

### RentRecord — 전세 실거래 (갭가격 계산 소스)
```
id, complexId(FK), areaPyeong, priceManwon, contractDate, floor, ingestedAt
인덱스: [complexId, areaPyeong], [contractDate]
※ 현재 실데이터 미연동 → gapPrice null 정상
```

### ListingStats — 매물 수 추이
```
id, complexId(FK), date, saleCount, rentCount, createdAt
유니크: [complexId, date]
```

### SchoolInfo — 학교알리미 API 연동
```
id, complexId(FK), schoolName, schoolType(공립|사립|국립),
address?, distance(미터), grade(상|중|하), schoolUrl?
유니크: [complexId, schoolName]
```

### MaintenanceFee — K-APT 관리비 이력
```
id, complexId(FK), yearMonth("202312"), communalFeeWon, indivFeeWon, totalFeeWon, collectedAt
유니크: [complexId, yearMonth]
```

### RecordHighPrice — 단지+평형별 역대 최고가
```
id, complexId(FK), areaPyeong, currentPrice, currentTxId,
previousPrice?, previousTxId?, recordSetAt, updatedAt
유니크: [complexId, areaPyeong]
```

### RecordHighHistory — 신고가 변동 전체 이력
```
id, recordHighId(FK), eventType, newPrice, previousPrice?,
transactionId, contractDate, priceDelta?, deltaPercent?, occurredAt
```

### CancellationLog — 취소 이력
```
id, complexId, areaPyeong, cancelledTxId, cancelledPrice,
revertedToPrice?, revertedToTxId?, wasRecordHigh, detectedAt
```

### Advertiser + ApartmentAdvertiser — 광고주 N:M
```
Advertiser: id, name, phone?, linkUrl?, isActive, createdAt
ApartmentAdvertiser: id, advertiserId(FK), complexId(FK), createdAt
유니크: [advertiserId, complexId]
```

---

## Prisma 7 설정 패턴

```prisma
# schema.prisma
datasource db { provider = "postgresql" }
generator client {
  provider = "prisma-client"           # "prisma-client-js" 아님 (Prisma 7 변경)
  output   = "../app/generated/prisma"
}
```

```typescript
# lib/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

---

## 공공데이터 스크립트 설계

| 스크립트 | API | 핵심 로직 |
|---|---|---|
| `map-kb-ids.ts` | KB부동산 (puppeteer 인터셉트) | 단일 브라우저, 응답 JSON 인터셉트, 이름+동 신뢰도 매칭 |
| `map-kapt-codes.ts` | K-APT `kaptMasterInfo` | 시군구 코드(창원 48121~48129, 김해 48330) 순회, 90% 임계 자동 업데이트 |
| `fetch-kapt-details.ts` | K-APT `getKaptDetailInfo` + `getKaptMgPriceList` | 시설정보 1콜 + 월별 관리비 최대 12콜/단지, 필드명 다중 패턴 대응 |
| `fetch-school-data.ts` | NEIS `schoolInfo` (경상남도 초등학교) | Kakao 지오코딩(선택) + Haversine 거리, 동 이름 추정 폴백 |
| `collect-listings-kb.ts` | KB부동산 pl/{kbNo} (puppeteer) | 진행 바 [█░░] + 소요시간, 실패 단지 건너뛰기 |

**공통 규칙:** `--dry-run` 지원, 단지 간 최소 1초 딜레이, `logs/` 디렉터리에 JSON 로그 저장.
