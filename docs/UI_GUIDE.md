# UI 디자인 가이드 — 리얼레코드 창부이 데이터랩

> **벤치마크**: 토스(Toss) + Linear  
> 토스의 데이터 밀도와 신뢰감, Linear의 기능적 미니멀리즘을 결합한다.

---

## 디자인 철학

### 3원칙

**1. 숫자가 주인공이다**  
부동산 데이터 서비스의 핵심은 숫자다. UI는 숫자가 잘 읽히도록 배경에 물러서야 한다. 장식은 숫자의 경쟁자가 아니라 조력자다.

**2. 여백은 비어 있는 게 아니라 숨 쉬는 공간이다**  
토스처럼 정보를 촘촘하게 담되, 줄 간격과 그룹 간격으로 읽기 흐름을 만든다. 패딩을 줄여서 밀도를 높이지 말고, 섹션 분리로 밀도를 관리한다.

**3. 인터랙션은 기능이고 장식이 아니다**  
hover, focus, active 상태는 "여기를 누를 수 있다"는 신호다. 순수 장식 애니메이션은 없다.

---

## 안티패턴 — 절대 하지 마라

| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` / glass morphism | AI 슬롭 1번 |
| gradient-text | AI 슬롭 2번 |
| `box-shadow` 글로우 / 네온 | AI 슬롭 3번 |
| 배경 gradient orb (`blur-3xl`) | 모든 AI 랜딩의 공통 패턴 |
| 이모지를 UI 아이콘으로 사용 | 일관성 파괴 (`lucide-react` 사용) |
| `card-hover`의 `translateY(-1px)` | Toss는 transform 없이 배경색으로만 hover 표현 |
| `rounded-2xl`을 모든 카드에 일괄 적용 | "AI가 만든 SaaS" 느낌의 원인 |
| 보라/인디고 색상 | AI = 보라 클리셰 |
| 플로팅 아이콘 남발 | 정보 밀도 저하 |
| 섹션마다 `border-b`로 구분하는 무거운 구분선 | 가벼운 `divider` 유틸리티 사용 |

**허용되는 예외 — StickyHeader의 `backdrop-blur-md`**  
스크롤 시 내비게이션 헤더에서 콘텐츠 위에 떠 있음을 표현하는 기능적 용도. 장식 목적이 아님.

**허용되는 예외 — KingOfDayCard의 gradient 배경**  
대시보드의 단 하나뿐인 히어로 카드. 다른 어떤 컴포넌트에도 그라데이션 배경 금지.

---

## 색상 시스템

### 팔레트 (globals.css `@theme` 참조)

```
Neutral ─────────────────────────────────────────────────────
gray-0   #ffffff   카드 배경
gray-50  #f8fafc   페이지 배경, 서브 카드, hover 배경
gray-100 #f1f5f9   구분선, 비활성 칩 배경
gray-150 #e9eef5   내부 border (card-inner)
gray-200 #e2e8f0   subtle border
gray-300 #cbd5e1   disabled 텍스트
gray-400 #94a3b8   보조 아이콘, placeholder
gray-500 #64748b   보조 텍스트 (날짜, 단위, 레이블)
gray-600 #475569   중간 강도 텍스트
gray-700 #334155   서브 제목
gray-800 #1e293b   강한 텍스트
gray-900 #0f172a   기본 본문, 가격 수치

Brand ───────────────────────────────────────────────────────
primary-50   #eff6ff   활성 배지 배경, 선택된 행 배경
primary-600  #2563eb   클릭 가능한 링크, 강조 아이콘
primary-700  #1d4ed8   CTA 버튼 배경
primary-900  #1e3a8a   가격 수치 (dark 강조)

Accent (Teal — 브랜드 포인트) ──────────────────────────────
accent-500  #14b8a6   신고가 배지, 주요 강조
accent-600  #0d9488   버튼 hover, 차트 line color

Semantic ────────────────────────────────────────────────────
positive-600 #16a34a   ▲ 상승, 신고가, 초품아
negative-600 #dc2626   ▼ 하락, 취소 감지
warning-600  #d97706   직거래 배지
```

### 색상 사용 규칙

```
가격 수치 (큰)     → text-gray-900 font-bold text-price
가격 상승 델타     → text-positive-600
가격 하락 델타     → text-negative-600
거래취소 배지      → text-gray-500 bg-gray-100 (중립 — 과도한 경고감 지양)
직거래 배지        → text-warning-600 bg-warning-50
신고가 배지        → text-accent-600 bg-accent-50 (또는 bg-primary-50)
비활성 / 준비 중   → text-gray-400 bg-gray-100
```

---

## 타이포그래피

### 폰트

```
한국어 기본   Noto Sans KR — var(--font-noto)
숫자 / 가격   DM Sans     — var(--font-dm), font-variant-numeric: tabular-nums
```

`.text-price` 유틸리티는 DM Sans + tabular-nums + letter-spacing: -0.025em을 묶어서 제공한다.

### 스케일

| 역할 | 클래스 |
|------|--------|
| 페이지 단지명 | `text-xl font-bold text-gray-900` |
| 섹션 제목 | `text-sm font-bold text-gray-800` |
| 카드 레이블 | `text-xs font-medium text-gray-500 uppercase tracking-wide` |
| 가격 (히어로) | `text-price text-3xl font-bold text-gray-900` |
| 가격 (카드) | `text-price text-xl font-bold text-primary-900` |
| 가격 (행 내부) | `text-price text-sm font-bold text-gray-900` |
| 본문 데이터 | `text-sm text-gray-700` |
| 보조 텍스트 | `text-xs text-gray-500` |
| 아주 작은 레이블 | `text-[11px] text-gray-400` |

### 숫자 표기

- 가격은 항상 `text-price` + `font-bold`
- 단위(`억`, `만원`, `건`, `%`)는 한 단계 작은 `text-sm text-gray-500`으로 분리
- tabular-nums 덕분에 자릿수가 달라도 수직 정렬이 맞는다

---

## 스페이싱

```
페이지 전체 패딩    px-4 sm:px-6
콘텐츠 최대 너비    max-w-6xl mx-auto
섹션 간격           space-y-5 (20px) — 너무 넓으면 Linear 느낌이 사라짐
카드 내부 패딩      p-5 (20px)
카드 내부 타이트     p-4 (16px)
행(row) 수직 패딩   py-3 또는 py-3.5
행 사이 구분선      divide-y divide-gray-100
그룹 내 아이콘+텍스트 gap-2.5 또는 gap-3
```

---

## 컴포넌트 패턴

### 카드 (`.card`)

```
background: #ffffff
border-radius: 14px  (rounded-[14px] 또는 rounded-xl)
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)
border: 1px solid #f1f5f9
```

**안에서 다시 카드가 필요할 때 — `.card-inner`**:
```
background: #f8fafc
border-radius: 10px
border: 1px solid #e9eef5
```

`rounded-2xl`은 외부 container에서만 가끔 허용. 카드 내부 요소엔 `rounded-lg` (8px) 이하.

### 리스트 행 (Toss 스타일)

토스는 리스트를 카드 안에 담고 `divide-y`로 구분한다. 각 행은 간결하다.

```tsx
<div className="divide-y divide-gray-100">
  <div className="flex items-center gap-3 py-3.5 row-interactive px-1 rounded-lg">
    <span className="text-sm text-gray-700 flex-1">{label}</span>
    <span className="text-sm font-bold text-price text-gray-900">{value}</span>
  </div>
</div>
```

행에서 hover 효과는 `row-interactive` 유틸리티 (배경색만 변경, transform 없음).

### 버튼

```
Primary CTA
  bg-primary-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold
  hover:bg-primary-800  active:scale-[0.98]

Secondary
  bg-gray-100 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium
  hover:bg-gray-150

Disabled
  bg-gray-100 text-gray-400 cursor-not-allowed  (CSS-only tooltip과 함께)

Text Link
  text-primary-600 text-sm hover:text-primary-800 underline-offset-2
```

### 배지 / 칩

```
신고가    rounded-full bg-primary-50  text-primary-700 text-[11px] font-semibold px-2 py-0.5
취소감지  rounded-full bg-gray-100   text-gray-500   text-[11px] font-medium  px-2 py-0.5
직거래    rounded-full bg-warning-50 text-warning-600 text-[11px] font-semibold px-2 py-0.5
초품아    rounded-full bg-teal-50   text-teal-700   text-[11px] font-semibold px-2 py-0.5
평형칩    rounded-lg   bg-gray-100   text-gray-600   text-xs    font-medium  px-2 py-0.5
활성평형  rounded-lg   bg-primary-50 text-primary-700 text-xs   font-semibold px-2 py-0.5 ring-1 ring-primary-200
```

### 아이콘

- `lucide-react` 사용, `size={14}` 또는 `size={16}` 기본
- strokeWidth는 Lucide 기본값(2) 유지 — 1.5로 줄이면 흐릿해짐
- 아이콘을 둥근 컨테이너 박스로 감싸는 패턴은 **최소화** (섹션 헤더 수준에서만)
- 텍스트와 함께: `flex items-center gap-1.5`
- 색상: 텍스트와 동일하거나 `text-gray-400`

### 가격 델타 (`PriceDelta`)

```
▲ +N억    text-positive-600   (green)
▼ -N억    text-negative-600   (red)
—         text-gray-400
```

델타 옆에 퍼센트를 함께 보여줄 경우: `+N억 (+X%)` 형식으로 한 줄에 표시.

### StatCard

토스의 수치 카드는 단순하다. 레이블 → 수치 → 보조정보 순서.

```
레이블   text-xs font-medium text-gray-500 uppercase tracking-wide
수치     text-2xl font-bold text-price text-gray-900
보조     text-xs text-gray-400
```

hover는 `card-hover` (shadow만 변경) 대신 배경색 변화 없이 그대로 둔다 — StatCard는 인터랙티브 요소가 아님.

---

## 레이아웃

```
페이지 기반        max-w-6xl mx-auto px-4 sm:px-6
대시보드 그리드    grid grid-cols-1 lg:grid-cols-5 gap-5
상세 2열 그리드    grid grid-cols-1 md:grid-cols-2 gap-4
섹션 제목 간격     mb-3 (섹션 제목 → 카드)
카드 내부 섹션     space-y-4
```

---

## 데이터 표시 패턴

### 대형 수치 (히어로 숫자)

```tsx
<p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
  {label}
</p>
<p className="text-price text-3xl font-bold text-gray-900">
  {value}
  <span className="text-base font-medium text-gray-500 ml-1">{unit}</span>
</p>
```

### 요약 행

```tsx
<div className="flex items-center justify-between py-3 divider">
  <span className="text-sm text-gray-600">{label}</span>
  <span className="text-sm font-semibold text-gray-900 text-price">{value}</span>
</div>
```

### 스파크라인 (관리비 추이)

SVG 직접 구현. recharts 오버헤드 없이.
- viewBox: `0 0 100 28`
- stroke: `gray-200`, hover: `gray-400`
- 애니메이션 없음

### 레이더 차트 (단지 밸런스)

SVG 직접 구현. 5개 축 기준.
- 배경 폴리곤: stroke `gray-200`, fill 없음
- 데이터 폴리곤: fill `rgba(156,163,175,0.12)`, stroke `gray-400`
- 레이블: `fontSize="8.5"` fill `gray-600`

---

## 애니메이션

### 허용

```
transition-colors duration-100    hover 배경색 변화 (행, 버튼)
transition-opacity duration-200   StickyHeader fade-in, CSS-only 툴팁
transition-transform duration-300 Accordion ChevronDown 회전
recharts 기본 애니메이션          SmartChart 데이터 로드 시
```

### 금지

```
transform translateY (카드 hover lift)
글로우 pulse / bounce / spin (장식)
gradient shimmer (텍스트, 배경)
background-size 애니메이션 (gradient 이동)
```

---

## CSS-only 툴팁 패턴

```tsx
<div className="group/tipname relative">
  <TriggerElement />
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
    opacity-0 group-hover/tipname:opacity-100 transition-opacity duration-150
    pointer-events-none">
    <span className="block bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1 whitespace-nowrap">
      {content}
    </span>
  </div>
</div>
```

---

## StickyHeader 동작

```
scroll < 200px    opacity-0, pointer-events-none, aria-hidden=true
scroll ≥ 200px    opacity-100, backdrop-blur-md (기능적 예외)
```

---

## SmartChart 규칙

```
기간 칩   "1y" | "3y" | "5y" | "all"  (기본 "3y")
아웃라이어  중앙값 ±35%
데이터 < 2  "데이터가 쌓이지 않았습니다" 빈 상태
전체 아웃라이어  자동 복구 버튼 제공
색상       Area fill: primary-100, stroke: primary-600
취소 거래   점 색상: negative-500
```

---

## KingOfDayCard — 유일한 gradient 예외

```
background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0d9488 100%)
border-radius: rounded-xl (14px)
```

내부 텍스트는 white 계열. 배경 장식 orb(radial-gradient 흰 원)는 허용 — 단, 이 컴포넌트에서만.

---

## 포털 링크 버튼 (SummaryCards)

```
네이버   bg-[#03C75A] text-white  hover:bg-[#02a849]
KB       bg-amber-400 text-amber-950  hover:bg-amber-500
준비 중  bg-gray-100  text-gray-400  cursor-not-allowed
         + CSS-only "준비 중" tooltip
```

---

## 학교 배지

```
초품아 (600m 이내 초등)   text-teal-700 bg-teal-50 border border-teal-100 rounded-full
거리 확인 중 (isEstimated) text-amber-500 text-xs  (배지 없이 텍스트만)
정보 없음                  Skeleton 또는 "—"
```

---

## 데이터 신뢰도 표시

서비스에는 신뢰도가 다른 여러 데이터 소스가 혼재한다.

```
GEOCODED (지오코딩 실거리)  → 정상 표시
ESTIMATED (동 이름 추정)    → "거리 확인 중" 텍스트 (amber-500), 초품아 배지 미표시
PENDING (신축 공백)         → "—" 또는 "데이터 준비 중" (gray-400)
MANUAL (어드민 입력)        → 정상 표시 (사용자에게 출처 구분 불필요)
```

신뢰도가 낮은 데이터는 **틀린 값 표시 대신 "확인 중" 상태**를 보여준다. 틀린 정보는 서비스 신뢰도를 영구적으로 훼손한다.

---

## 글로벌 레이아웃 (GlobalHeader + Footer)

**GlobalHeader**
```
border-b border-slate-200 bg-white sticky top-0 z-40
내부: max-w-6xl mx-auto px-4 sm:px-6 py-4
로고: 브랜드 파란-틸 gradient (유일 허용 — 16px 이하의 아이콘 내부)
nav 링크: text-sm text-gray-500  hover:text-gray-900  active: text-primary-700 font-semibold
```

**Footer**
```
border-t border-slate-200 mt-12 py-6
text-center text-xs text-gray-400
```
