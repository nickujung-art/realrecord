import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, TrendingUp, ArrowLeft, Building2, Phone, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import type { AdvertiserSummary } from "@/types/api";
import { SmartChart } from "@/components/apartment/SmartChart";
import { SummaryCards } from "@/components/apartment/SummaryCards";
import { FacilityInfoSection } from "@/components/apartment/InfoSections";
import { StickyHeader } from "@/components/apartment/StickyHeader";
import { ComplexConditionBento } from "@/components/complex/ComplexConditionBento";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getApartmentDetail } from "@/lib/queries/apartments";
import { formatManwon, formatManwonShort } from "@/lib/utils/formatPrice";
import { Footer } from "@/components/layout/Footer";

// ── 추천 부동산 섹션 ──────────────────────────────────────────────
function RecommendedAgents({
  advertisers,
  complexName,
}: {
  advertisers: AdvertiserSummary[];
  complexName: string;
}) {
  if (advertisers.length === 0) {
    return (
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              이 단지의 추천 부동산이 되어보세요
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {complexName} 관련 부동산 중개사무소라면 지금 바로 등록하세요
            </p>
          </div>
        </div>
        <a
          href="mailto:nickujung@gmail.com?subject=리얼레코드 광고 문의"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-colors"
        >
          <ExternalLink size={13} />
          문의하기
        </a>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={15} className="text-teal-500" />
        <h2 className="text-sm font-bold text-slate-900">이 단지 추천 부동산</h2>
        <span className="text-xs text-slate-400">{advertisers.length}개</span>
      </div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        {advertisers.map((adv) => (
          <AdvertiserCard key={adv.id} advertiser={adv} />
        ))}
      </div>
    </div>
  );
}

function AdvertiserCard({ advertiser }: { advertiser: AdvertiserSummary }) {
  const inner = (
    <div
      className={`
        flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all
        bg-gray-50/50
        ${advertiser.linkUrl
          ? "border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer"
          : "border-slate-100 cursor-default"}
      `}
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0">
        <Building2 size={18} className="text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm font-bold text-slate-900 truncate">
            {advertiser.name}
          </span>
          {advertiser.linkUrl && (
            <ExternalLink size={11} className="text-slate-400 flex-shrink-0" />
          )}
        </div>
        {advertiser.phone && (
          <div className="flex items-center gap-1.5 mt-1">
            <Phone size={11} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">{advertiser.phone}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (advertiser.linkUrl) {
    return (
      <a href={advertiser.linkUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

interface ApartmentPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pyeong?: string }>;
}

export default async function ApartmentPage({ params, searchParams }: ApartmentPageProps) {
  const { id } = await params;
  const { pyeong: pyeongParam } = await searchParams;

  // Parse the URL param first so we can pass it to the query for gap price calculation
  const pyeongFromParam = parseInt(pyeongParam ?? "", 10);
  const requestedPyeong = isNaN(pyeongFromParam) ? undefined : pyeongFromParam;

  const data = await getApartmentDetail(id, requestedPyeong);
  if (!data) notFound();

  const { complex, recordHighs, recentTransactions, priceHistory, cancellationCount, advertisers, gapPrice, schoolInfos } = data;

  // Derive the most-traded area as the default, then validate the URL param against real data
  const areaCount = new Map<number, number>();
  for (const p of priceHistory) {
    areaCount.set(p.areaPyeong, (areaCount.get(p.areaPyeong) ?? 0) + 1);
  }
  let topAreaPyeong = 0, _topCount = 0;
  for (const [area, count] of areaCount) {
    if (count > _topCount) { topAreaPyeong = area; _topCount = count; }
  }
  const selectedPyeong = (!isNaN(pyeongFromParam) && areaCount.has(pyeongFromParam))
    ? pyeongFromParam
    : topAreaPyeong;

  // 선택된 평형을 ㎡로 변환 (ComplexConditionBento API 파라미터용)
  const targetAreaSqm = Math.round(selectedPyeong * 3.305785);

  return (
    <main className="min-h-screen bg-surface">
      <StickyHeader complexName={complex.name} selectedPyeong={selectedPyeong} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 뒤로가기 */}
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          검색으로 돌아가기
        </Link>

        {/* 단지 헤더 */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-primary-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 break-words">{complex.name}</h1>
                {complex.hasRecentCancellation && (
                  <WarningBadge cancellationCount={cancellationCount} size="md" />
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                <MapPin size={13} />
                <span>
                  {complex.city} {complex.district} {complex.dong}
                </span>
                {complex.roadAddress && (
                  <>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="text-slate-400">{complex.roadAddress}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 평형별 신고가 */}
          {recordHighs.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                평형별 역대 최고가
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recordHighs.map((rh) => {
                  const sqm = Math.round(rh.areaPyeong * 3.305785);
                  const isSelected = selectedPyeong === rh.areaPyeong;
                  return (
                    <Link
                      key={rh.areaPyeong}
                      href={`/apartments/${id}?pyeong=${rh.areaPyeong}`}
                      scroll={false}
                      className={`block rounded-xl p-3 border transition-all ${
                        isSelected
                          ? "bg-primary-50 border-primary-300 ring-2 ring-primary-600/20"
                          : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp
                          size={12}
                          className={isSelected ? "text-primary-600" : "text-accent-600"}
                        />
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? "text-primary-700" : "text-slate-500"
                          }`}
                        >
                          {sqm}㎡ ({rh.areaPyeong}평)
                        </span>
                      </div>
                      <div className="text-price font-bold text-primary-900 text-lg">
                        {formatManwonShort(rh.currentPrice)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatManwon(rh.currentPrice)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 추천 부동산 섹션 */}
        <RecommendedAgents advertisers={advertisers} complexName={complex.name} />

        {/* 단지 시설 정보 */}
        <FacilityInfoSection
          parkingCount={complex.parkingCount}
          heatingMethod={complex.heatingMethod}
          hallwayType={complex.hallwayType}
          totalHouseholds={complex.totalHouseholds}
          hasGym={complex.hasGym}
          hasLibrary={complex.hasLibrary}
          hasDaycare={complex.hasDaycare}
          hasSeniorCenter={complex.hasSeniorCenter}
          hasPlayground={complex.hasPlayground}
        />

        {/* 페르소나 요약 카드 */}
        <SummaryCards
          complexName={complex.name}
          selectedPyeong={selectedPyeong}
          gapPrice={gapPrice}
          naverHscpNo={complex.naverHscpNo}
          kbComplexNo={complex.kbComplexNo}
        />

        {/* 에듀 & 리빙: 관리비(평형별) + 학군 */}
        <ComplexConditionBento
          complexId={complex.id}
          targetArea={targetAreaSqm}
          selectedPyeong={selectedPyeong}
          schoolInfos={schoolInfos}
        />

        {/* 가격 추이 차트 */}
        <div className="card p-6">
          <SectionHeader
            title="가격 추이"
            subtitle="계약일 기준"
          />
          <SmartChart data={priceHistory} height={280} selectedPyeong={selectedPyeong} />
        </div>

        {/* 최근 거래 목록 */}
        <div className="card p-6">
          <SectionHeader
            title="최근 거래"
            subtitle={`총 ${recentTransactions.length}건`}
          />
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const sqm = Math.round(tx.areaPyeong * 3.305785);
              const date = new Date(tx.contractDate).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-4 py-3 ${tx.cancelFlag ? "opacity-50" : ""}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-price text-slate-900">
                        {formatManwonShort(tx.priceManwon)}
                      </span>
                      {tx.cancelFlag && (
                        <span className="text-xs text-danger-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">
                          취소
                        </span>
                      )}
                      {tx.directDeal && (
                        <span className="text-xs text-warning-500 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
                          직거래
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {sqm}㎡ · {tx.floor}층 · {date}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 text-right">
                    {formatManwon(tx.priceManwon)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
