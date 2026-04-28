import Link from "next/link";
import { Building2, TrendingUp, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { searchComplexes } from "@/lib/queries/search";
import { formatManwonShort } from "@/lib/utils/formatPrice";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const results = q ? await searchComplexes(q) : { results: [], total: 0, query: q };

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #1e3a8a, #14b8a6)" }}
            >
              R
            </div>
            <span className="font-bold text-primary-900 text-sm hidden sm:inline">
              리얼레코드
            </span>
          </Link>
          <div className="flex-1">
            <SearchBar defaultValue={q} autoFocus={!q} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {q ? (
          <>
            <p className="text-sm text-slate-500 mb-4">
              <strong className="text-slate-900">&ldquo;{q}&rdquo;</strong> 검색 결과{" "}
              {results.total}건
            </p>

            {results.results.length === 0 ? (
              <div className="card p-12 text-center">
                <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm">검색 결과가 없습니다</p>
                <p className="text-slate-400 text-xs mt-1">
                  다른 단지명이나 동 이름으로 검색해보세요
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.results.map((item) => (
                  <Link
                    key={item.id}
                    href={`/apartments/${item.id}`}
                    className="card card-hover flex items-center gap-4 p-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-primary-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        {item.hasRecentCancellation && <WarningBadge size="sm" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                        <span>{item.city}</span>
                        <span className="text-slate-300">·</span>
                        <span>{item.dong}</span>
                        <span className="text-slate-300">·</span>
                        <span>거래 {item.transactionCount}건</span>
                      </div>
                    </div>

                    {item.latestRecordPrice && (
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-accent-600 text-xs font-medium mb-0.5">
                          <TrendingUp size={11} />
                          <span>최고가</span>
                        </div>
                        <div className="text-price font-bold text-primary-900">
                          {formatManwonShort(item.latestRecordPrice)}
                        </div>
                        {item.topAreaPyeong && (
                          <div className="text-xs text-slate-400">
                            {Math.round(item.topAreaPyeong * 3.305785)}㎡
                          </div>
                        )}
                      </div>
                    )}

                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card p-12 text-center">
            <Building2 size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="text-slate-500">단지명 또는 동 이름을 검색하세요</p>
            <p className="text-slate-400 text-sm mt-1">초성 검색도 지원합니다 (예: ㄷㅅ → 더샵)</p>
          </div>
        )}
      </div>
    </main>
  );
}
