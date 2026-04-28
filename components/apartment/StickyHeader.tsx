"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StickyHeaderProps {
  complexName: string;
  selectedPyeong: number;
}

export function StickyHeader({ complexName, selectedPyeong }: StickyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #14b8a6)" }}
          >
            R
          </div>
          <span className="font-bold text-primary-900 text-sm hidden sm:inline">리얼레코드</span>
        </Link>

        {/* Fades in + slides down after scrolling 200px */}
        <div
          className={`flex-1 flex justify-center min-w-0 transition-all duration-300 ${
            scrolled
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-1 pointer-events-none"
          }`}
          aria-hidden={!scrolled}
        >
          <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
            {complexName}
            {selectedPyeong > 0 && (
              <span className="text-slate-400 font-normal ml-1.5">· {selectedPyeong}평</span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}
