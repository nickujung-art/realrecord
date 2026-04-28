import { Home, Search, ExternalLink } from "lucide-react";
import { formatManwonShort } from "@/lib/utils/formatPrice";

interface SummaryCardsProps {
  complexName: string;
  selectedPyeong: number;
  gapPrice: number | null;
  naverHscpNo: string | null;
  kbComplexNo: string | null;
}

function CardRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      <span className={`text-sm font-bold ${valueClass ?? "text-slate-700"}`}>{value}</span>
    </div>
  );
}

// ── 포털 버튼 ────────────────────────────────────────────────────────────────

function PortalButton({
  href,
  label,
  activeClass,
}: {
  href: string | null;
  label: string;
  activeClass: string;
}) {
  const base =
    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all";

  if (!href) {
    return (
      <div className="group/portaltip relative flex-1">
        <div className={`${base} bg-slate-100 text-slate-400 cursor-not-allowed`}>
          {label}
        </div>
        {/* CSS-only tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/portaltip:opacity-100 transition-opacity z-10">
          <span className="block bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1 whitespace-nowrap">
            준비 중
          </span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${activeClass} active:scale-95`}
    >
      {label}
      <ExternalLink size={11} className="opacity-80" />
    </a>
  );
}

// ── 매물 보러가기 섹션 ────────────────────────────────────────────────────────

function ListingLinksRow({
  naverUrl,
  kbUrl,
}: {
  naverUrl: string | null;
  kbUrl: string | null;
}) {
  const bothMissing = !naverUrl && !kbUrl;

  return (
    <div className="py-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Search size={16} className={bothMissing ? "text-slate-300" : "text-slate-500"} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-700">현재 매물 보러가기</p>
          <p className="text-xs text-slate-400 mt-0.5">
            실거래 분석 후 매물을 직접 확인하세요
          </p>
        </div>
      </div>

      <div className="flex gap-2 pl-11">
        <PortalButton
          href={naverUrl}
          label="네이버 부동산"
          activeClass="bg-[#03C75A] hover:bg-[#02a849] text-white shadow-sm hover:shadow"
        />
        <PortalButton
          href={kbUrl}
          label="KB부동산"
          activeClass="bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-sm hover:shadow"
        />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SummaryCards({
  complexName: _,
  selectedPyeong,
  gapPrice,
  naverHscpNo,
  kbComplexNo,
}: SummaryCardsProps) {
  const pyeongLabel = selectedPyeong > 0 ? `${selectedPyeong}평 기준` : null;

  const gapPriceValue = gapPrice !== null
    ? `약 ${formatManwonShort(gapPrice)}`
    : "전세 데이터 부족";
  const gapPriceClass = gapPrice !== null
    ? "text-price font-bold text-primary-900"
    : "text-slate-400 text-xs font-medium";

  const naverUrl = naverHscpNo
    ? `https://fin.land.naver.com/complexes/${naverHscpNo}`
    : null;
  const kbUrl = kbComplexNo
    ? `https://www.kbland.kr/pl/${kbComplexNo}`
    : null;

  return (
    <div className="card p-5">
      <p className="text-sm font-bold text-slate-900">📈 투자자 패키지</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-1">
        투자 타이밍을 가늠해 보세요
        {pyeongLabel && (
          <span className="ml-1 font-medium text-slate-500">· {pyeongLabel}</span>
        )}
      </p>
      <div className="divide-y divide-slate-100">
        <CardRow
          icon={<Home size={16} className="text-slate-600" />}
          label="현재 갭 가격"
          value={gapPriceValue}
          valueClass={gapPriceClass}
        />
        <ListingLinksRow naverUrl={naverUrl} kbUrl={kbUrl} />
      </div>
    </div>
  );
}
