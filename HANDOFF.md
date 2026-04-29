# 리얼레코드 창부이 데이터랩 — HANDOFF

> /clear 후에도 이 파일 하나로 전체 맥락을 복원할 수 있도록 작성된 핸드오프 문서.
> 마지막 업데이트: 2026-04-28

---

## 프로젝트 개요

**창원·김해 아파트 실거래 신고가 추적 + 거래취소 감지 프리미엄 대시보드**

- 슬로건: "오늘 우리 동네 챔피언은? 창원·김해 부동산의 심장박동을 읽다"
- 타겟: 창원시·김해시 부동산 실수요자 / 투자자
- 경로: `C:/Users/GIGABYTE/Coding/realrecord-main`
- 개발 서버: `npm run dev` → `http://localhost:3000`

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js 16.2.4 (App Router) |
| 언어 | TypeScript 5 |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| ORM | Prisma 7.7.0 |
| DB 드라이버 | `@prisma/adapter-pg` + `pg` (Supabase PostgreSQL) |
| 배포 목표 | Cloudflare Workers + Supabase PostgreSQL |
| 차트 | recharts 3.8.1 |
| 아이콘 | lucide-react 1.8.0 |
| 스크립트 런타임 | tsx |
| 크롤러 | puppeteer (KB부동산 수집용) |
| 지도 | react-kakao-maps-sdk (카카오 지도) |

**Next.js 16 breaking change 주의** — `params`/`searchParams`는 `Promise<{...}>`이며 반드시 `await` 필요. `AGENTS.md` 참조.

**Tailwind v4 주의** — `clsx`/`tailwind-merge` 없음. 템플릿 리터럴만 사용. 커스텀 토큰: `primary-50/600/700/900`, `accent-500/600`, `positive-600`, `negative-600`, `warning-600`, `text-price`, `card`, `card-inner`, `row-interactive`, `divider`, `bg-surface`. 상세 내용은 `docs/UI_GUIDE.md` 참조.

---

## 환경변수

`.env` (Prisma CLI용) + `.env.local` (Next.js + tsx 스크립트용) 둘 다 필요.

```env
# 필수
DATABASE_URL=postgresql://postgres.[PROJECT]:[PW]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
MOLIT_API_KEY=<공공데이터포털 디코딩된 키>
MOLIT_API_BASE_URL=https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev

# 카카오 지도 (지도 검색 페이지 필수)
NEXT_PUBLIC_KAKAO_MAP_API_KEY=<카카오 JavaScript API 키>

# 공공데이터 연동 (스크립트용)
PUBLIC_DATA_API_KEY=<한국부동산원 K-APT API 키>
NEIS_API_KEY=<학교알리미 NEIS API 키>

# 선택 (학교 지오코딩 정밀도 향상)
KAKAO_REST_API_KEY=<카카오 REST API 키>

# Vercel Cron 일별 인제스트 인증
INGEST_SECRET=<임의 비밀 문자열>
```

---

## 디렉터리 구조

```
realrecord/
├── app/
│   ├── page.tsx                        # 메인 대시보드 (SSR, force-dynamic)
│   ├── search/page.tsx                 # 검색 페이지
│   ├── map/page.tsx                    # 지도 검색 페이지 (카카오 지도)
│   ├── apartments/[id]/page.tsx        # 아파트 상세 페이지 (Server Component)
│   ├── admin/advertisers/page.tsx      # 광고주 관리 어드민 UI
│   ├── api/
│   │   ├── ingest/route.ts             # MOLIT 수동 인제스트 트리거
│   │   ├── ingest/daily/route.ts       # Vercel Cron 일별 자동 인제스트 (INGEST_SECRET 인증)
│   │   ├── search/route.ts
│   │   ├── dashboard/route.ts
│   │   ├── apartments/[id]/route.ts
│   │   ├── complex/[id]/maintenance-fee/route.ts  # 평형별 관리비 추정 API
│   │   ├── complexes/within-bounds/route.ts       # 지도 viewport bounds → 단지 목록
│   │   ├── record-breakers/route.ts    # Deprecated (410)
│   │   └── admin/advertisers/[route]
│   └── generated/prisma/               # Prisma 생성 클라이언트 (커밋됨)
├── components/
│   ├── layout/
│   │   ├── GlobalHeader.tsx            # [Client] 전역 내비게이션 바 (대시보드/지도 검색)
│   │   └── Footer.tsx                  # 데이터 출처 푸터
│   ├── map/
│   │   └── ApartmentMap.tsx            # [Client] 카카오 지도 + bounds 기반 단지 마커
│   ├── dashboard/
│   │   ├── DashboardStats.tsx
│   │   ├── KingOfDayCard.tsx
│   │   ├── RecordBreakerList.tsx       # 빈 상태 → Mock 인기 단지 TOP 3
│   │   ├── RecordBreakerSection.tsx    # RecordBreakerList 래퍼 (헤더 포함)
│   │   └── PremiumAgents.tsx
│   ├── search/
│   │   └── SearchBar.tsx               # Live Search (debounce 250ms, 초성 지원)
│   ├── complex/
│   │   ├── ComplexConditionBento.tsx   # [Client] 관리비 스파크라인 + 학군(초/중/고) 벤토
│   │   └── ComplexLivingBento.tsx      # 주차/시설보안/레이더차트 벤토 (미통합)
│   ├── apartment/
│   │   ├── SmartChart.tsx              # [Client] 기간 칩 + AI 아웃라이어 토글 (recharts AreaChart)
│   │   ├── SummaryCards.tsx            # 실거주자·투자자 패키지 (갭가격 + 포털 링크 CTA)
│   │   ├── StickyHeader.tsx            # [Client] 스크롤 200px 이후 fade-in
│   │   ├── SchoolCard.tsx              # 학군 정보 카드 (레거시 — ComplexConditionBento로 대체)
│   │   └── InfoSections.tsx            # FacilityInfoSection (현재 사용), MaintenanceFeeSection (레거시)
│   └── ui/
│       ├── DirectDealBadge.tsx
│       ├── PriceDelta.tsx
│       ├── SectionHeader.tsx
│       ├── Skeleton.tsx
│       ├── StatCard.tsx
│       └── WarningBadge.tsx
├── lib/
│   ├── db.ts                           # Prisma 클라이언트 싱글턴 (PrismaPg)
│   ├── molit/
│   │   ├── client.ts
│   │   └── normalizer.ts
│   ├── ingest/
│   │   ├── pipeline.ts
│   │   ├── recordHighLogic.ts
│   │   └── cancellationLogic.ts
│   ├── queries/
│   │   ├── dashboard.ts
│   │   ├── apartments.ts               # getApartmentDetail(id, pyeong?)
│   │   └── search.ts
│   └── utils/
│       ├── chosung.ts
│       ├── dateUtils.ts
│       └── formatPrice.ts
├── scripts/
│   ├── ingest-all.ts
│   ├── ingest-historical.ts
│   ├── ingest-repair.ts
│   ├── fix-gu.ts
│   ├── map-kb-ids.ts
│   ├── collect-listings-kb.ts
│   ├── map-kapt-codes.ts
│   ├── fetch-kapt-details.ts
│   ├── fetch-school-data.ts
│   ├── clean-school-data.ts        # 좌표 없는 단지의 SchoolInfo 정리 (Phase 2)
│   ├── geocode-complexes.ts        # 단지 좌표 일괄 적재 + dataStatus 업데이트 (Phase 2)
│   └── geocode-schools-kakao.ts    # 카카오 SC4로 학교 실거리 보완 (Phase 2)
├── types/
│   ├── api.ts                          # API 응답 타입 전체
│   └── molit.ts
├── prisma/
│   └── schema.prisma                   # DB 스키마 (14개 모델)
└── logs/                               # 매핑 스크립트 실행 로그 (gitignore)
```

---

## DB 스키마 (Prisma 7 PostgreSQL — 14개 모델)

### ApartmentComplex — 단지 마스터
```
id, name, nameChosung,
kbComplexNo?,        ← KB부동산 단지 번호
naverHscpNo?,        ← 네이버 부동산 단지 번호
kaptCode?,           ← 한국부동산원 K-APT 코드
parkingCount?,       ← K-APT 주차 총대수 (레거시)
parkingCountGround?,      ← 지상 주차대수
parkingCountUnderground?, ← 지하 주차대수
elevatorCount?,      ← 승강기 대수
heatingMethod?,      ← 난방방식 (개별난방|중앙난방|지역난방)
hallwayType?,        ← 복도유형 (계단식|복도식|혼합식)
totalHouseholds?,    ← 총 세대수
exclusiveAreaSum?,   ← 주거전용면적합계
maintenanceAreaSum?, ← 관리비부과면적 (평형별 관리비 추정 핵심)
cctvCount?,          ← CCTV 대수
hasGym?,             ← 헬스장 여부
hasLibrary?,         ← 작은도서관 여부
hasDaycare?,         ← 어린이집 여부
hasSeniorCenter?,    ← 경로당 여부
hasPlayground?,      ← 놀이터 여부
detailedRawData?,    ← K-APT API 원본 전체 (Json)
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
※ schoolLevel("초등학교"|"중학교"|"고등학교") 은 DB 컬럼 없음 — types/api.ts SchoolInfoSummary에서 파생
```

### MaintenanceFee — K-APT 관리비 이력
```
id, complexId(FK), yearMonth("202312"), communalFeeWon, indivFeeWon, totalFeeWon, collectedAt
유니크: [complexId, yearMonth]
※ 관리비 추정 공식: (totalFeeWon / maintenanceAreaSum) × (평형㎡ × 1.3)
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

## Prisma 7 세팅 패턴

```prisma
# schema.prisma
datasource db { provider = "postgresql" }
generator client {
  provider = "prisma-client"           # "prisma-client-js" 아님
  output   = "../app/generated/prisma"
}
```

```ts
# lib/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
```

**스키마 변경 후 항상 실행:**
```bash
npx prisma db push && npx prisma generate
```

---

## 아파트 상세 페이지 — 핵심 설계

### URL 구조
`/apartments/[id]?pyeong=N` — pyeong이 전역 상태. scroll={false} Link로 URL만 교체.

### 데이터 흐름
```
page.tsx (Server Component)
  └─ getApartmentDetail(id, pyeong?)    # lib/queries/apartments.ts
       ├─ complex (naverHscpNo, kbComplexNo, kaptCode, 시설 정보 포함)
       ├─ recordHighs (평형별 역대 최고가)
       ├─ recentTransactions (최근 20건)
       ├─ priceHistory (전체, SmartChart용)
       ├─ cancellationCount
       ├─ advertisers
       ├─ gapPrice (매매 - 전세, pyeong 지정 시만 계산)
       ├─ listingStats (최신 2건 → saleDiffPercentage 계산)
       ├─ schoolInfos (거리순 상위 2개)
       └─ maintenanceFees (최근 12개월, yearMonth 내림차순)
```

### 페이지 레이아웃 순서 (현재)
1. `StickyHeader` (Client, 스크롤 200px+ fade-in)
2. 단지 헤더 (이름, 주소, 평형별 역대 최고가 배지)
3. `RecommendedAgents` (광고주 카드)
4. `FacilityInfoSection` (난방방식, 복도유형 등 정적 시설 정보)
5. `SummaryCards` (갭가격 + 포털 CTA 버튼)
6. `ComplexConditionBento` (Client — 관리비 스파크라인/아코디언 + 학군 초/중/고)
7. `SmartChart` (기간 필터 + AI 아웃라이어 토글)
8. 최근 거래 목록
9. `Footer`

### 평형 선택 로직 (chicken-and-egg 해결)
```
pyeongFromParam = parseInt(URL ?pyeong)
requestedPyeong = isNaN ? undefined : param   ← 쿼리에 전달 (갭가격용, 미검증)
─── getApartmentDetail 호출 후 ───
selectedPyeong = areaCount.has(param) ? param : topAreaPyeong  ← UI용 검증값
targetAreaSqm = Math.round(selectedPyeong * 3.305785)          ← ComplexConditionBento API 파라미터
```

---

## 지도 검색 페이지 (`/map`)

- `ApartmentMap.tsx` — `react-kakao-maps-sdk` Client Component
- 초기 중심: 창원 (35.228, 128.681), level 5
- 지도 이동 시 `onBoundsChanged` → `/api/complexes/within-bounds?swLat=&swLng=&neLat=&neLng=` 자동 호출
- 단지 마커 클릭 → `/apartments/[id]` 이동
- `NEXT_PUBLIC_KAKAO_MAP_API_KEY` 없으면 안내 fallback 표시
- **주의**: 단지의 `latitude`, `longitude`가 null인 행은 마커 미표시 (DB에 좌표 적재 필요)

---

## Vercel Cron 일별 자동 인제스트

- 엔드포인트: `GET /api/ingest/daily`
- 인증: `Authorization: Bearer <INGEST_SECRET>` 헤더 필수
- 동작: 창원(48240) + 김해(48250) 전날 데이터 수집 (신고 접수 지연 대응)
- 환경변수 `INGEST_SECRET` 필수

---

## ComplexConditionBento 설계

**Client Component** — 평형별 관리비를 클라이언트에서 동적 fetch.

```
ComplexConditionBento
  ├─ SchoolBentoCard   — schoolInfos(서버 prop), 초/중/고 레벨별 분리
  │                       초등학교 600m 이내 → "초품아" 배지 (teal)
  └─ MaintenanceCard   — /api/complex/[id]/maintenance-fee?targetArea={㎡}
       ├─ 연평균 관리비 (추정값)
       ├─ SVG 스파크라인 (12개월, hover 시 진해짐)
       ├─ 하절기(6–8월)/동절기(12–2월) 비교
       └─ Accordion — 월별 상대 바 + 계절성 분석 인사이트
```

**관리비 추정 공식**: `(totalFeeWon / maintenanceAreaSum) × (전용㎡ × 1.3)`  
— `maintenanceAreaSum`이 없으면 API 422 반환, 카드는 `—` 표시.

**schoolLevel** 은 DB 컬럼이 아님. `SchoolInfoSummary.schoolLevel`은 학교 이름에서 파생하거나 별도 매핑이 필요. 현재 `types/api.ts`에 타입만 선언됨 — `getApartmentDetail` 쿼리에서 파생 로직 확인 필요.

---

## ComplexLivingBento 설계 (미통합)

**Server Component** — 정적 시설 데이터만 사용. 현재 아파트 상세 페이지에 미연결.

```
ComplexLivingBento
  ├─ ParkingCard     — 지상/지하 분리, 세대당 주차대수, "지상에 차 없는 단지" 칩
  ├─ FacilityCard    — CCTV 세대당 비율 + 시설 칩 (피트니스/작은도서관/어린이집/경로당/놀이터)
  └─ BalanceRadarChart — 5축(경제성/교육/주차/편의/안전) 순수 SVG 레이더 차트
```

---

## 공공데이터 연동 스크립트

### 실행 순서 (최초 세팅)
```bash
npx tsx scripts/ingest-historical.ts          # 1. MOLIT 실거래 전체 수집
npx tsx scripts/map-kb-ids.ts [--dry-run]     # 2. KB부동산 단지 코드 매핑
npx tsx scripts/map-kapt-codes.ts [--dry-run] # 3. K-APT 단지 코드 매핑
npx tsx scripts/fetch-kapt-details.ts [--fees-only | --info-only]  # 4. K-APT 시설+관리비
npx tsx scripts/geocode-complexes.ts [--dry-run]      # 5. 단지 좌표 적재 (지도 마커 필수)
npx tsx scripts/clean-school-data.ts [--dry-run]      # 6. 오염 학교 데이터 정리
npx tsx scripts/fetch-school-data.ts [--dry-run]      # 7. 학교알리미 수집
npx tsx scripts/geocode-schools-kakao.ts [--dry-run]  # 8. 카카오 실거리 보완
npx tsx scripts/collect-listings-kb.ts                # 9. KB부동산 매물 수 (주기적)
```

### 스크립트 주요 설계
| 스크립트 | API | 핵심 로직 |
|---|---|---|
| `map-kb-ids.ts` | KB부동산 (puppeteer 인터셉트) | 단일 브라우저, 응답 JSON 인터셉트, 이름+동 신뢰도 매칭 |
| `map-kapt-codes.ts` | K-APT `kaptMasterInfo` | 시군구 코드(창원 48121~48129, 김해 48330) 순회, 90% 임계 자동 업데이트 |
| `fetch-kapt-details.ts` | K-APT `getKaptDetailInfo` + `getKaptMgPriceList` | 시설정보 1콜 + 월별 관리비 최대 12콜/단지, 필드명 다중 패턴 대응 |
| `fetch-school-data.ts` | NEIS `schoolInfo` (경상남도 초등학교) | Kakao 지오코딩(선택) + Haversine 거리, 동 이름 추정 폴백 |
| `collect-listings-kb.ts` | KB부동산 pl/{kbNo} (puppeteer) | 진행 바 [█░░] + 소요시간, 실패 단지 건너뛰기 |

**모든 스크립트 공통:** `--dry-run` 지원, 단지 간 최소 1초 딜레이, `logs/` 디렉터리에 JSON 로그 저장.

---

## MOLIT API 연동 핵심 (삽질 완료)

### LAWD_CD (올바른 코드)
| 지역 | 올바른 코드 | 잘못된 코드 |
|---|---|---|
| 창원시 | `48240` (통합코드) | `38110~38114` |
| 김해시 | `48250` | `38480` |

### API 동작 규칙
- `_type=json` 파라미터 필수 (기본 XML)
- 성공 코드: 실제로는 `"000"` → `/^0+$/` 정규식으로 체크
- 빈 결과 시 `items`가 `""` (빈 문자열) → `typeof items !== "object"` 체크
- 단건 응답 시 `items.item`이 배열이 아닌 객체 → 항상 배열로 정규화
- `dealAmount`: `"12,300"` 쉼표 포함 문자열, `excluUseAr`/`floor`/`sggCd`는 number 타입

---

## 컴포넌트 설계 패턴

### SmartChart (Client Component)
- Props: `{ data: PriceHistoryPoint[]; height?: number; selectedPyeong?: number }`
- 기간 칩: `"1y"|"3y"|"5y"|"all"` (기본 3y)
- AI 아웃라이어 토글: 동일 평형 중앙값 ±35% 벗어나면 아웃라이어
- 커스텀 Tooltip: 날짜 + 가격 + 전월 대비
- 엣지 케이스: 데이터 < 2개 → "충분한 데이터가 쌓이지 않았습니다", 전체 아웃라이어 → 자동 복구 버튼

### SummaryCards (Server Component)
- Props: `{ complexName, selectedPyeong, gapPrice, naverHscpNo, kbComplexNo }`
- 네이버: `https://fin.land.naver.com/complexes/${naverHscpNo}`
- KB: `https://www.kbland.kr/pl/${kbComplexNo}`
- null이면 CSS-only "준비 중" 툴팁 + disabled 버튼

### GlobalHeader (Client Component)
- 대시보드 (`/`) / 지도 검색 (`/map`) 내비게이션
- `usePathname()`으로 현재 페이지 active 스타일 적용
- 모든 페이지에서 사용 (메인, 상세, 지도)

### CSS-only 툴팁 패턴
```tsx
<div className="group/tipname relative">
  <TriggerElement />
  <div className="absolute ... opacity-0 group-hover/tipname:opacity-100 transition-opacity">
    Tooltip content
  </div>
</div>
```

---

## types/api.ts — 핵심 타입

### SchoolInfoSummary
```typescript
interface SchoolInfoSummary {
  id: string;
  schoolName: string;
  schoolType: string;      // "공립" | "사립" | "국립"
  schoolLevel: "초등학교" | "중학교" | "고등학교" | null;  // DB 컬럼 없음, 파생값
  address: string | null;
  distance: number;        // 직선거리 (미터)
  grade: string;           // "상" | "중" | "하"
  schoolUrl: string | null;
}
```

### ApartmentDetailResponse.complex (주요 필드)
```typescript
complex: {
  // 기존
  id, name, city, district, dong, roadAddress?,
  hasRecentCancellation: boolean,
  naverHscpNo?, kbComplexNo?, kaptCode?,
  parkingCount?, elevatorCount?, heatingMethod?, hallwayType?, totalHouseholds?,
  // 신규 추가
  parkingCountGround?, parkingCountUnderground?,
  maintenanceAreaSum?,
  cctvCount?,
  hasGym?, hasLibrary?, hasDaycare?, hasSeniorCenter?, hasPlayground?,
}
```

---

## DB 현황 (2026-04-28 기준)

| 항목 | 수치 |
|---|---|
| 총 거래 (Transaction) | **약 7만 건** (창원 48240 + 김해 48250) |
| RentRecord | 외부 크롤러 미연동 — 갭가격 null 정상 |
| ListingStats | collect-listings-kb.ts 실행 필요 |
| SchoolInfo | fetch-school-data.ts 실행 필요 (NEIS_API_KEY 필요) |
| MaintenanceFee | fetch-kapt-details.ts 실행 필요 (PUBLIC_DATA_API_KEY + kaptCode 매핑 선행) |
| kbComplexNo 매핑 | map-kb-ids.ts 실행 필요 |
| kaptCode 매핑 | map-kapt-codes.ts 실행 필요 |
| latitude/longitude | 지도 마커 표시에 필수 — 미적재 단지는 지도에 미표시 |

---

## Sprint 진행 현황

### Sprint 1–5 (완료 2026-04-23)
- Next.js 16 + Prisma 7 + Supabase 세팅
- MOLIT API 연동 + 인제스트 파이프라인
- 검색 (초성 지원) + 대시보드 UI
- 광고주 수익 모델 (Advertiser N:M)
- 대시보드 날짜 기준 개선 (최신 거래일 기준)
- Supabase 마이그레이션 + 약 7만 건 적재

### Sprint 6 — UX/UI 고도화 (완료 2026-04-24)
- ✅ `SmartChart.tsx` — 기간 칩, AI 아웃라이어 토글, 커스텀 Tooltip, 엣지 케이스
- ✅ `SummaryCards.tsx` — 실거주자/투자자 패키지 (초기 Mock)
- ✅ `StickyHeader.tsx` — 스크롤 fade-in, `aria-hidden`, `backdrop-blur-md`
- ✅ `RecordBreakerList.tsx` — 빈 상태 Mock TOP 3 (창원 인기 단지)
- ✅ WarningBadge: "유의" → "거래 알림", amber → slate 톤
- ✅ PremiumAgents: 이모지 정리
- ✅ 전역 평형 필터: `?pyeong=N` URL 상태, 평형 배지 `<Link scroll={false}>`

### Sprint 7 — 데이터 연동 (완료 2026-04-24)
- ✅ 스키마 추가: `RentRecord`, `ListingStats`, `SchoolInfo`
- ✅ `getApartmentDetail(id, pyeong?)` — 갭가격, ListingStats diff 계산
- ✅ SummaryCards: 실 갭가격 + ListingStats saleCount/rentCount/saleDiffPercentage 연동
- ✅ 포털 링크 CTA: `kbComplexNo`, `naverHscpNo` → 네이버/KB 버튼 (disabled 툴팁)
- ✅ `map-kb-ids.ts` — puppeteer 단일 브라우저, 네트워크 인터셉트 매핑
- ✅ `collect-listings-kb.ts` — DB 기반, [█] 진행 바, 요약

### Sprint 8 — 공공데이터 풀스택 (완료 2026-04-24)
- ✅ 스키마 추가: `SchoolInfo` (schoolType, address, schoolUrl, @@unique), `MaintenanceFee`
- ✅ `ApartmentComplex` 확장: `kaptCode`, `parkingCount`, `elevatorCount`, `heatingMethod`, `hallwayType`, `totalHouseholds`
- ✅ `SchoolCard.tsx` — 학교알리미 기준, 도보 시간(4km/h), 등급 컬러 바, 학교 상세 링크
- ✅ `InfoSections.tsx` — `MaintenanceFeeSection` (계절 비교 바) + `FacilityInfoSection` (세대당 주차대수)
- ✅ `fetch-school-data.ts` — NEIS API, Kakao 지오코딩 + Haversine, 동 이름 추정 폴백
- ✅ `map-kapt-codes.ts` — 창원 구별(48121~48129) + 김해(48330), 90% 임계 자동 업데이트
- ✅ `fetch-kapt-details.ts` — `getKaptDetailInfo` + `getKaptMgPriceList` 12개월, 필드명 다중 패턴

### Sprint 9 — 지도 + 벤토 UI + 일별 자동 인제스트 (완료 2026-04-28)
- ✅ `app/map/page.tsx` + `ApartmentMap.tsx` — 카카오 지도 검색 페이지 (`react-kakao-maps-sdk`)
- ✅ `GlobalHeader.tsx` — 전역 내비게이션 바 (대시보드/지도 검색)
- ✅ `Footer.tsx` — 데이터 출처 표시 푸터
- ✅ `RecordBreakerSection.tsx` — RecordBreakerList 래퍼 (헤더 포함)
- ✅ `/api/complexes/within-bounds` — 지도 viewport bounds 단지 조회
- ✅ `/api/complex/[id]/maintenance-fee` — 평형별 관리비 추정 API (면적 비례)
- ✅ `/api/ingest/daily` — Vercel Cron 일별 자동 인제스트 (INGEST_SECRET 인증)
- ✅ `ApartmentComplex` 스키마 확장: `maintenanceAreaSum`, `parkingCountGround/Underground`, `cctvCount`, `hasGym/Library/Daycare/SeniorCenter/Playground`, `detailedRawData`
- ✅ `ComplexConditionBento.tsx` — 관리비 스파크라인 + 아코디언 + 학군 초/중/고 분리 벤토
- ✅ `ComplexLivingBento.tsx` — 주차/시설보안/SVG 레이더 차트 (미통합, 다음 Sprint)

### 미완료 / 다음 Sprint 후보
- ⏳ `ComplexLivingBento` 아파트 상세 페이지 통합 (컴포넌트 완성, 페이지 미연결)
- ⏳ 지도 단지 좌표 적재 (latitude/longitude NULL → 지도 마커 미표시)
- ⏳ 어드민 방어 로직: 중복 등록 409, 소프트 딜리트, Toast UI
- ⏳ 창원 검색 누락 원인 미확인 (`[DEBUG]` 콘솔 로그로 진단 필요)
- ⏳ RentRecord 실데이터 수집 (전세 크롤러 — 갭가격 현재 null)
- ⏳ SchoolInfo.schoolLevel DB 컬럼화 또는 파생 로직 명시 (학교 이름 기반 파싱)
- ⏳ SmartChart 평형 토글 UI (현재 URL param으로만 전환)
- ⏳ 인기 단지 TOP 3 실 집계 (현재 Mock 하드코딩)
- ⏳ 초품아 지수 실계산 (SummaryCards에 SchoolInfo.distance 기반 점수 연결)

---

## 학교 데이터 버그픽스 & 신축 단지 데이터 품질 로드맵

> 2026-04-28 작업. 남양초 고정 노출 버그 수정 + 신축 단지 데이터 공백 대응 전략.

### 즉시 (완료)

- ✅ `SchoolInfo.isEstimated Boolean` 컬럼 추가 (`prisma/schema.prisma`)
- ✅ `fetch-school-data.ts` — 구(區) 전체 900m 일괄 추정 경로 제거, 동 이름 일치 학교만 저장
- ✅ `lib/queries/apartments.ts` — `isEstimated: false` 필터 적용
- ✅ `ComplexConditionBento` — `isEstimated` 학교에 "거리 확인 중" 표시
- ✅ `scripts/clean-school-data.ts` 작성 — 좌표 없는 단지의 SchoolInfo 일괄 삭제
- ⬜ **DB 복구 후 실행 필요**: `npx tsx scripts/clean-school-data.ts` → `npx tsx scripts/fetch-school-data.ts`

### Phase 2 — 자동화 수집 보강 (2026-04-29 완료)

- ✅ **카카오 Place API로 학교 거리 보완**
  - 단지 좌표 기준 반경 1km 내 `category_group_code=SC4` 검색
  - NEIS schoolName과 교차검증 → 실거리로 `isEstimated: false` 업데이트
  - `scripts/geocode-schools-kakao.ts` 완성 (--dry-run, logs/ 저장)

- ✅ **단지 좌표(latitude/longitude) 일괄 적재**
  - 카카오 주소 검색 API → 키워드 검색 fallback
  - 성공 시 `dataStatus = "GEOCODED"` 업데이트
  - `scripts/geocode-complexes.ts` 완전 재작성 (--dry-run, logs/ 저장)

- ✅ **`ApartmentComplex.dataStatus` 필드** — 스키마에 이미 존재 (`@default("PENDING")`)
  - geocode-complexes.ts 성공 시 → `"GEOCODED"` 업데이트
  - 향후: 어드민 수동 입력 시 → `"MANUAL"`
  - ⬜ 국토부 건물 인허가 API 신축 준공 감지 — Phase 3으로 이월

- ✅ **오염 학교 데이터 정리**
  - `scripts/clean-school-data.ts` 신규 작성 (좌표 없는 단지 SchoolInfo 일괄 삭제)
  - --dry-run으로 삭제 대상 사전 확인 가능

**Phase 2 실행 순서 (DB 복구 후):**
```bash
# 1. 오염 데이터 사전 확인
npx tsx scripts/clean-school-data.ts --dry-run
# 2. 오염 데이터 삭제
npx tsx scripts/clean-school-data.ts
# 3. 단지 좌표 일괄 등록
npx tsx scripts/geocode-complexes.ts
# 4. 학교 데이터 재수집 (NEIS)
npx tsx scripts/fetch-school-data.ts
# 5. 카카오 실거리로 보완
npx tsx scripts/geocode-schools-kakao.ts
```

### Phase 3 — 유저 참여 & 어드민 Override (추후)

- ⬜ **어드민 단지 데이터 override 시스템**
  - `/admin/complexes/[id]/override` — 관리비/학교 수동 입력, dataStatus 변경
  - 현재 `/admin/advertisers`에 탭 추가 형태로 확장

- ⬜ **"이 정보 제보하기" 버튼** (입주민 크라우드소싱)
  - 데이터 없는 항목 옆 제보 버튼 → 어드민 검토 후 `MANUAL`로 저장
  - 검토 없이 즉시 반영 금지 (잘못된 크라우드 데이터 > 잘못된 공공 데이터)

### Phase 4 — 품질 모니터링 (추후)

- ⬜ **월 1회 데이터 품질 리포트 스크립트**
  - `scripts/data-quality-report.ts`
  - 출력: PENDING 단지 수 / 좌표 미등록 수 / SchoolInfo 없는 단지 수 / isEstimated 비율
