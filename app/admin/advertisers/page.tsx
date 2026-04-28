"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, X, Plus, Building2, Phone, Link2, Trash2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";
import { isChosungOnly } from "@/lib/utils/chosung";
import type { SearchResultItem } from "@/types/api";

// ── 타입 ──────────────────────────────────────────────────────────
interface MatchedComplex {
  id: string;
  complex: { id: string; name: string; city: string; dong: string };
}

interface Advertiser {
  id: string;
  name: string;
  phone: string | null;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  apartments: MatchedComplex[];
}

// ── 아파트 검색 드롭다운 컴포넌트 ─────────────────────────────────
function ApartmentSearchDropdown({
  onSelect,
}: {
  onSelect: (item: SearchResultItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isChosung = query.length > 0 && isChosungOnly(query);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setIsOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}&limit=8`);
        const data = await res.json();
        setResults(data.results ?? []);
        setIsOpen((data.results ?? []).length > 0);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  }

  function handleSelect(item: SearchResultItem) {
    onSelect(item);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white transition-all
          ${isOpen ? "border-teal-500 rounded-b-none border-b-slate-100" : "border-slate-200 focus-within:border-teal-500"}`}
      >
        <Search
          size={14}
          className={isLoading ? "text-teal-400 animate-pulse" : "text-slate-400"}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="단지명·동 검색 (초성 지원)"
          autoComplete="off"
          className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
        />
        {isChosung && !isLoading && (
          <span className="text-xs text-teal-600 font-medium bg-teal-50 px-1.5 py-0.5 rounded-full">
            초성
          </span>
        )}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 bg-white border-2 border-t-0 border-teal-500 rounded-b-xl shadow-lg overflow-hidden">
          {results.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-teal-50 transition-colors
                  ${idx < results.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.city} · {item.dong}</div>
                </div>
                {item.latestRecordPrice && (
                  <div className="flex items-center gap-1 text-teal-600 text-xs flex-shrink-0">
                    <TrendingUp size={10} />
                    <span>{(item.latestRecordPrice / 10000).toFixed(1)}억</span>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 광고주 등록 폼 ────────────────────────────────────────────────
function AddAdvertiserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [matchedComplexes, setMatchedComplexes] = useState<SearchResultItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleAddComplex(item: SearchResultItem) {
    if (matchedComplexes.some((c) => c.id === item.id)) return;
    setMatchedComplexes((prev) => [...prev, item]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("상호명을 입력해 주세요."); return; }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/advertisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          linkUrl,
          complexIds: matchedComplexes.map((c) => c.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      setName(""); setPhone(""); setLinkUrl(""); setMatchedComplexes([]);
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
    >
      <h3 className="text-base font-bold text-slate-900">신규 광고주 등록</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            상호명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 창원 더샵 부동산"
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            전화번호
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            링크 URL
          </label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none text-sm text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          담당 단지 매칭
        </label>
        <ApartmentSearchDropdown onSelect={handleAddComplex} />
        {matchedComplexes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {matchedComplexes.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-medium text-teal-800"
              >
                <Building2 size={11} />
                {c.name}
                <button
                  type="button"
                  onClick={() => setMatchedComplexes((prev) => prev.filter((x) => x.id !== c.id))}
                  className="text-teal-500 hover:text-teal-700"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          {isSubmitting ? "등록 중..." : "광고주 등록"}
        </button>
      </div>
    </form>
  );
}

// ── 광고주 행 컴포넌트 ────────────────────────────────────────────
function AdvertiserRow({
  advertiser,
  onRefresh,
}: {
  advertiser: Advertiser;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function toggleActive() {
    setIsToggling(true);
    await fetch(`/api/admin/advertisers/${advertiser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !advertiser.isActive }),
    });
    setIsToggling(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`"${advertiser.name}" 광고주를 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    await fetch(`/api/admin/advertisers/${advertiser.id}`, { method: "DELETE" });
    setIsDeleting(false);
    onRefresh();
  }

  async function handleAddComplex(item: SearchResultItem) {
    await fetch(`/api/admin/advertisers/${advertiser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addComplexId: item.id }),
    });
    onRefresh();
  }

  async function handleRemoveComplex(complexId: string) {
    await fetch(`/api/admin/advertisers/${advertiser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeComplexId: complexId }),
    });
    onRefresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 메인 행 */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* 상태 표시 */}
        <div className="flex-shrink-0">
          {advertiser.isActive ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> 활성
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <XCircle size={11} /> 비활성
            </span>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{advertiser.name}</span>
            <span className="text-xs text-slate-400">
              단지 {advertiser.apartments.length}개
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {advertiser.phone && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Phone size={11} /> {advertiser.phone}
              </span>
            )}
            {advertiser.linkUrl && (
              <a
                href={advertiser.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
              >
                <Link2 size={11} /> 링크
              </a>
            )}
          </div>
        </div>

        {/* 단지 배지 미리보기 */}
        <div className="hidden sm:flex flex-wrap gap-1 flex-1 justify-end">
          {advertiser.apartments.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate max-w-[100px]"
            >
              {a.complex.name}
            </span>
          ))}
          {advertiser.apartments.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              +{advertiser.apartments.length - 3}
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={toggleActive}
            disabled={isToggling}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition-colors disabled:opacity-50"
          >
            {advertiser.isActive ? "비활성화" : "활성화"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 확장 패널 — 단지 매칭 관리 */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            매칭 단지 관리
          </p>
          <ApartmentSearchDropdown onSelect={handleAddComplex} />
          {advertiser.apartments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">
              매칭된 단지가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {advertiser.apartments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-slate-200"
                >
                  <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={12} className="text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {a.complex.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.complex.city} · {a.complex.dong}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveComplex(a.complex.id)}
                    className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function AdminAdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");

  const fetchAdvertisers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/advertisers");
      const data = await res.json();
      setAdvertisers(data.advertisers ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdvertisers(); }, [fetchAdvertisers]);

  const filtered = advertisers.filter(
    (a) =>
      !filterQuery ||
      a.name.includes(filterQuery) ||
      a.apartments.some((ap) => ap.complex.name.includes(filterQuery))
  );

  const activeCount = advertisers.filter((a) => a.isActive).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">광고주 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            총 {advertisers.length}명 · 활성 {activeCount}명
          </p>
        </div>

        {/* 광고주 등록 폼 */}
        <AddAdvertiserForm onCreated={fetchAdvertisers} />

        {/* 목록 필터 + 테이블 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">광고주 목록</h2>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 focus-within:border-teal-500 bg-white w-48">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="이름·단지 필터"
                className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
              />
              {filterQuery && (
                <button type="button" onClick={() => setFilterQuery("")}>
                  <X size={12} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-white rounded-2xl border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              {filterQuery ? "검색 결과가 없습니다." : "등록된 광고주가 없습니다."}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((advertiser) => (
                <AdvertiserRow
                  key={advertiser.id}
                  advertiser={advertiser}
                  onRefresh={fetchAdvertisers}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
