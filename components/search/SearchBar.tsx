"use client";

import { Search, X, Building2, TrendingUp, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { isChosungOnly } from "@/lib/utils/chosung";
import { formatManwonShort } from "@/lib/utils/formatPrice";
import type { SearchResponse, SearchResultItem } from "@/types/api";
import { WarningBadge } from "@/components/ui/WarningBadge";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  defaultValue = "",
  placeholder = "단지명 또는 동 이름으로 검색 (초성 지원)",
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChosung = query.length > 0 && isChosungOnly(query);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=8`);
      if (!res.ok) return;
      const data: SearchResponse = await res.json();
      setSuggestions(data.results);
      setIsOpen(data.results.length > 0);
      setActiveIndex(-1);
    } catch {
      // 네트워크 오류 시 드롭다운 유지
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    });
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[activeIndex];
      setIsOpen(false);
      router.push(`/apartments/${selected.id}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div
          className={`
            flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border-2
            transition-all duration-150
            ${isPending ? "opacity-70" : ""}
            ${isOpen ? "border-primary-500 rounded-b-none border-b-gray-100" : "focus-within:border-primary-600 border-gray-200"}
          `}
          style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.02)" }}
        >
          <Search
            size={18}
            className={`flex-shrink-0 transition-colors ${
              isLoading ? "text-primary-400 animate-pulse" : query ? "text-primary-600" : "text-slate-400"
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent font-sans"
          />

          {isChosung && !isLoading && (
            <span className="flex-shrink-0 text-xs text-primary-500 font-medium bg-primary-50 px-2 py-0.5 rounded-full">
              초성 검색
            </span>
          )}

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={15} />
            </button>
          )}

          {/* 모바일: 아이콘만 / 데스크탑: 텍스트 버튼 */}
          <button
            type="submit"
            disabled={!query.trim() || isPending}
            aria-label="검색"
            className="flex-shrink-0 flex items-center justify-center bg-primary-700 text-white rounded-lg hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors
              h-8 w-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 sm:rounded-lg sm:text-xs sm:font-semibold sm:gap-1"
          >
            <Search size={14} className="sm:hidden" />
            <span className="hidden sm:inline">{isPending ? "검색 중…" : "검색"}</span>
          </button>
        </div>
      </form>

      {/* ── Live Search 드롭다운 ── */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 bg-white border-2 border-t-0 border-primary-500 rounded-b-xl overflow-hidden"
          style={{ boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.08)" }}
          role="listbox"
        >
          <ul>
            {suggestions.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === activeIndex}>
                <Link
                  href={`/apartments/${item.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    idx === activeIndex ? "bg-primary-50" : "hover:bg-slate-50"
                  } ${idx < suggestions.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-primary-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {item.name}
                      </span>
                      {item.hasRecentCancellation && <WarningBadge size="sm" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.city} · {item.dong}
                    </div>
                  </div>

                  {item.latestRecordPrice && (
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-accent-600 text-xs mb-0.5">
                        <TrendingUp size={10} />
                        <span className="font-medium">신고가</span>
                      </div>
                      <div className="text-sm font-bold text-primary-900">
                        {formatManwonShort(item.latestRecordPrice)}
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* 전체 결과 보기 */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-primary-700 font-semibold bg-primary-50 hover:bg-primary-100 transition-colors border-t border-slate-100"
          >
            <span>전체 결과 보기</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
