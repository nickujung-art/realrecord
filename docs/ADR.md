# Architecture Decision Records — 리얼레코드 창부이 데이터랩

## 철학

**데이터 정확성 + 개발 속도 균형.** 공공 API 연동의 복잡성을 먼저 해결하고, 그 위에 빠르게 UI를 쌓는다. 외부 의존성은 필요한 것만 추가. 작동하는 최소 구현을 선택한다.

---

### ADR-001: Next.js App Router (Server Components 우선)

**결정**: Next.js 16 App Router, Server Component 기본, 인터랙션이 필요한 곳만 Client Component.

**이유**: 
- DB 쿼리를 서버에서 직접 실행 → API Route 레이어 불필요 (단순성)
- SSR로 초기 로드 시 SEO 및 성능 확보
- 부동산 데이터는 실시간 갱신보다 요청 시점 정확성이 더 중요

**트레이드오프**: 
- Client Component로 전환 시 prop drilling 주의 필요
- `params`/`searchParams`가 `Promise<{...}>`로 변경 (Next.js 16 breaking change) — 반드시 `await` 필요

---

### ADR-002: Prisma 7 + Supabase PostgreSQL

**결정**: ORM으로 Prisma 7, DB는 Supabase PostgreSQL, `@prisma/adapter-pg`로 연결.

**이유**:
- Prisma의 타입 안전 쿼리로 복잡한 집계(신고가, 갭가격, ListingStats diff)를 안전하게 작성
- Supabase: 관리형 PostgreSQL로 운영 부담 최소화, 한국 리전(ap-northeast-2) 지원
- Cloudflare Workers 배포 목표 → edge 환경에서 `@prisma/adapter-pg` (connection pooler 경유) 필수

**트레이드오프**:
- Prisma 7에서 generator 이름이 `"prisma-client-js"` → `"prisma-client"`로 변경됨. 구버전 코드 참조 시 혼동 주의.
- 스키마 변경 시 `npx prisma db push && npx prisma generate` 항상 필요
- Generated client를 `app/generated/prisma/`에 커밋해서 CI 환경에서도 빌드 가능하게 유지

---

### ADR-003: Tailwind CSS v4 (`@tailwindcss/postcss`)

**결정**: Tailwind v4 사용. `clsx`/`tailwind-merge` 없이 템플릿 리터럴만으로 클래스 조합.

**이유**:
- Tailwind v4의 CSS-first 설정으로 별도 config 파일 불필요
- `clsx`/`tailwind-merge` 추가 의존성 및 번들 크기 증가 회피
- 커스텀 디자인 토큰(`primary-*`, `accent-*`, `text-price`, `card`, `bg-surface`)을 CSS 변수로 정의

**트레이드오프**:
- 조건부 클래스가 많아지면 가독성 저하 → UI 컴포넌트 단위 분리로 관리
- v3의 `@apply`/`tailwind.config.js` 패턴과 다르므로 기존 Tailwind 경험자 혼동 가능

---

### ADR-004: MOLIT API — LAWD_CD 통합코드 사용

**결정**: 창원시는 `48240`, 김해시는 `48250` (통합 법정동 코드) 사용.

**이유**:
- 창원시는 2010년 마산·진해·창원 통합 후 새 코드(`48240`) 부여
- 구별 코드(`48121~48129`)는 MOLIT API에서 다른 결과를 반환하거나 누락 발생
- 김해시도 마찬가지로 구 코드(`38480`)가 아닌 현행 코드(`48250`) 사용

**트레이드오프**:
- 통합 코드로 수집 시 구별(성산구, 의창구 등) 세분화가 쿼리 레벨에서만 가능
- 구별 코드 사용 시 창원 전체 커버리지 누락 → 통합코드가 훨씬 안전

---

### ADR-005: 공공데이터 수집 — 배치 스크립트 방식

**결정**: 실시간 웹훅/스트리밍 대신 `tsx` 배치 스크립트(`scripts/`)로 주기적 수집.

**이유**:
- MOLIT API는 월별 배치 제공 (실시간 API 없음)
- KB부동산 puppeteer 크롤링은 브라우저 인스턴스 비용이 크므로 배치가 적합
- Supabase 무료 플랜 connection 제한 → 스크립트별 순차 실행이 안전

**트레이드오프**:
- 신고가 감지의 실시간성 부재 → 일 1회 수집 배치로 D+1 데이터 제공
- K-APT 관리비 데이터가 2~3개월 지연 제공됨 (API 한계)

---

### ADR-006: 평형 선택 — URL 파라미터 상태 관리

**결정**: 평형 선택은 `?pyeong=N` URL 파라미터로 관리. `<Link scroll={false}>`로 페이지 이동 없이 URL만 교체.

**이유**:
- URL로 평형 상태를 공유 가능 (딥링크)
- Server Component가 `searchParams`로 직접 읽어서 서버 렌더링에 사용
- 전역 상태 관리 라이브러리(Zustand 등) 불필요

**트레이드오프**:
- 평형 변경 시 전체 Server Component 재렌더링 발생 → 성능 허용 범위 내 (단일 페이지)
- `chicken-and-egg` 문제: URL param이 DB에 없는 평형일 경우 검증 로직 필요 (해결됨, `architecture.md` 참조)

---

### ADR-007: 광고주 수익 모델 — N:M 관계 + 어드민 UI

**결정**: `Advertiser` ↔ `ApartmentComplex` N:M 관계. `/admin/advertisers` 어드민 UI로 관리.

**이유**:
- 한 광고주(공인중개사)가 여러 단지에 광고 가능
- 한 단지에 여러 광고주 노출 가능
- 향후 광고비 청구 단위가 "단지별 계약"이 될 것을 고려

**트레이드오프**:
- 현재 어드민은 기본 CRUD만 구현 (중복 등록 409, 소프트 딜리트, Toast UI는 미완료)
- 인증/권한 관리 없음 → 내부 운영 단계에서 IP 화이트리스트 등으로 임시 보호

---

### ADR-008: CSS-only 툴팁 (JS 없음)

**결정**: 툴팁/팝오버는 Tailwind `group-hover` + `opacity` 전환으로 구현. JS 없음.

**이유**:
- 포털 링크 버튼의 "준비 중" 툴팁 등 단순 정보 표시에 JS 불필요
- `radix-ui`/`headlessui` 같은 라이브러리 추가 없이 동일 효과

**패턴**:
```tsx
<div className="group/tipname relative">
  <TriggerElement />
  <div className="absolute ... opacity-0 group-hover/tipname:opacity-100 transition-opacity">
    Tooltip content
  </div>
</div>
```

**트레이드오프**: 키보드 접근성(focus-visible) 지원 미흡 → 향후 개선 필요.
