# 리얼레코드 창부이 데이터랩

**창원·김해 아파트 실거래 신고가 추적 + 거래취소 감지 프리미엄 대시보드**
슬로건: "오늘 우리 동네 챔피언은? 창원·김해 부동산의 심장박동을 읽다"

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js 16.2.4 (App Router) |
| 언어 | TypeScript 5 strict |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| ORM | Prisma 7.7.0 |
| DB 드라이버 | `@prisma/adapter-pg` + `pg` (Supabase PostgreSQL) |
| 배포 목표 | Cloudflare Workers + Supabase PostgreSQL |
| 차트 | recharts 3.8.1 |
| 아이콘 | lucide-react 1.8.0 |
| 스크립트 런타임 | tsx |
| 크롤러 | puppeteer (KB부동산 수집) |

---

## CRITICAL 아키텍처 규칙

- CRITICAL: 모든 외부 API 및 DB 호출은 `app/api/` 라우트 핸들러 또는 Server Component에서만 처리. 클라이언트 컴포넌트에서 직접 외부 API 절대 호출 금지.
- CRITICAL: Next.js 16 — `params`/`searchParams`는 반드시 `Promise<{...}>`로 타이핑하고 `await` 해야 함. 동기 접근 시 런타임 에러 발생.
- CRITICAL: Tailwind v4 — `clsx`/`tailwind-merge` 없음. 클래스 조합은 템플릿 리터럴만 사용.
- CRITICAL: Prisma 7 — generator 이름은 `"prisma-client"` (구버전 `"prisma-client-js"` 아님). 스키마 변경 후 반드시 `npx prisma db push && npx prisma generate` 실행.
- CRITICAL: DB 클라이언트는 `lib/db.ts`의 싱글턴만 사용. `PrismaPg` 어댑터로 Supabase PostgreSQL 연결.
- 컴포넌트는 `components/` 폴더에, 타입은 `types/` 폴더에, DB 쿼리 함수는 `lib/queries/`에 분리.
- 공공데이터 수집 스크립트는 `scripts/` 폴더에, `npx tsx scripts/xxx.ts`로 실행.

---

## Tailwind v4 커스텀 토큰

```
primary-50 / primary-700 / primary-900   ← 브랜드 컬러
accent-600                                ← 강조 색상
text-price                                ← 가격 표시 전용
card                                      ← 카드 배경
bg-surface                                ← 페이지 배경
```

---

## 환경변수

`.env` (Prisma CLI용) + `.env.local` (Next.js + tsx 스크립트용) 둘 다 필요.

```env
# 필수
DATABASE_URL=postgresql://postgres.[PROJECT]:[PW]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
MOLIT_API_KEY=<공공데이터포털 디코딩된 키>
MOLIT_API_BASE_URL=https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev

# 카카오 지도 (지도 검색 페이지 필수) — developers.kakao.com > 앱 키 > JavaScript 키
NEXT_PUBLIC_KAKAO_MAP_API_KEY=<카카오 JavaScript API 키>

# 공공데이터 연동 스크립트용
PUBLIC_DATA_API_KEY=<한국부동산원 K-APT API 키>
NEIS_API_KEY=<학교알리미 NEIS API 키>

# 선택 (학교 서버사이드 지오코딩 정밀도 향상) — REST 키 ≠ JS 키
KAKAO_REST_API_KEY=<카카오 REST API 키>

# Vercel Cron 인증 — Vercel 대시보드 > Settings > Environment Variables에 반드시 설정
# Vercel이 Cron 요청 시 Authorization: Bearer <CRON_SECRET>을 자동으로 전송함
CRON_SECRET=<임의의 강력한 랜덤 문자열>

# 수동 curl 테스트용 (CRON_SECRET과 같은 값으로 설정하거나 별도 관리 가능)
INGEST_SECRET=<CRON_SECRET과 동일하거나 별도 값>
```

---

## 명령어

```bash
npm run dev      # 개발 서버 → http://localhost:3000
npm run build    # 프로덕션 빌드
npm run lint     # ESLint

# DB 스키마 변경 후
npx prisma db push && npx prisma generate

# 공공데이터 수집 (최초 세팅 순서)
npx tsx scripts/ingest-historical.ts      # 1. MOLIT 실거래 전체
npx tsx scripts/map-kb-ids.ts             # 2. KB부동산 단지 코드 매핑
npx tsx scripts/map-kapt-codes.ts         # 3. K-APT 코드 매핑
npx tsx scripts/fetch-kapt-details.ts     # 4. K-APT 시설+관리비
npx tsx scripts/fetch-school-data.ts      # 5. NEIS 학교알리미
npx tsx scripts/collect-listings-kb.ts    # 6. KB 매물 수 (주기적)
```

---

## MOLIT API 핵심 주의사항 (삽질 완료)

**올바른 LAWD_CD:**
- 창원시: `48240` (통합코드, 구별 38110~38114 절대 사용 금지)
- 김해시: `48250` (38480 사용 금지)

**API 동작 규칙:**
- `_type=json` 파라미터 필수 (기본값 XML)
- 성공 코드: `"000"` — `/^0+$/` 정규식으로 체크
- 빈 결과 시 `items`가 `""` 빈 문자열 → `typeof items !== "object"`로 체크
- 단건 응답 시 `items.item`이 배열 아닌 객체 → 항상 배열로 정규화
- `dealAmount`: `"12,300"` 쉼표 포함 문자열, `excluUseAr`/`floor`/`sggCd`는 number 타입

---

## CSS-only 툴팁 패턴 (JS 없음)

```tsx
<div className="group/tipname relative">
  <TriggerElement />
  <div className="absolute ... opacity-0 group-hover/tipname:opacity-100 transition-opacity">
    Tooltip content
  </div>
</div>
```

---

## 개발 프로세스

- 새 기능 구현 시 테스트를 먼저 작성하고 통과하는 구현 작성 (TDD)
- 커밋 메시지는 conventional commits 형식 (feat:, fix:, docs:, refactor:)
- 모든 공공데이터 스크립트: `--dry-run` 지원, 단지 간 최소 1초 딜레이, `logs/` 폴더에 JSON 로그 저장

---

## 미완료 / 다음 Sprint 후보

- ⏳ 어드민 방어 로직: 중복 등록 409, 소프트 딜리트, Toast UI
- ⏳ 창원 검색 누락 원인 미확인 (`[DEBUG]` 콘솔 로그로 진단 필요)
- ⏳ RentRecord 실데이터 수집 (전세 크롤러 — 갭가격 현재 null)
- ⏳ 초품아 지수 실계산 (SchoolInfo.distance 기반 → SummaryCards Mock 대체)
- ⏳ SmartChart 평형 토글 UI
- ⏳ 인기 단지 TOP 3 실 집계 (현재 Mock 하드코딩)

자세한 내용은 `docs/` 폴더 참조.
