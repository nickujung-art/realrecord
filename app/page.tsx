import { Suspense } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { KingOfDayCard } from "@/components/dashboard/KingOfDayCard";
import { RecordBreakerList } from "@/components/dashboard/RecordBreakerList";
import { RecordBreakerSection } from "@/components/dashboard/RecordBreakerSection";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PremiumAgents } from "@/components/dashboard/PremiumAgents";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { Footer } from "@/components/layout/Footer";
import { getDashboardData } from "@/lib/queries/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function DashboardContent() {
  const data = await getDashboardData();

  const latestDateLabel = data.latestTransactionDate
    ? new Date(data.latestTransactionDate).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "최근";

  return (
    <>
      <DashboardStats stats={data.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-1">
        <div className="lg:col-span-2">
          <SectionHeader
            title="King of the Day"
            subtitle={`${latestDateLabel} 최고가 거래`}
          />
          <KingOfDayCard data={data.kingOfDay} />
        </div>

        <div className="lg:col-span-3">
          <RecordBreakerSection items={data.recordBreakers} />
        </div>
      </div>

      <div>
        <SectionHeader
          title="🏆 우리 동네 프리미엄 중개사"
          subtitle="창원·김해 현장 전문가와 직접 연결하세요"
        />
        <PremiumAgents />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface">
      <GlobalHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <div className="text-center pt-2 pb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-keep">
            창원·김해 부동산의{" "}
            <span className="text-primary-700">심장박동</span>을 읽다
          </h1>
          <p className="text-gray-500 text-sm mb-5 break-keep">
            신고가 실시간 추적 · 거래 취소 즉시 감지
          </p>
          <SearchBar placeholder="단지명·동 이름으로 검색" />
        </div>

        <Suspense
          fallback={
            <div className="space-y-6">
              <DashboardStats stats={null} isLoading />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <KingOfDayCard data={null} isLoading />
                </div>
                <div className="lg:col-span-3">
                  <div className="card p-2">
                    <RecordBreakerList items={[]} isLoading />
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>

      <Footer />
    </main>
  );
}
