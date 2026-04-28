"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";

export function GlobalHeader() {
  const pathname = usePathname();

  return (
    <header
      className="border-b border-slate-200 bg-white sticky top-0 z-40"
      style={{ boxShadow: "0 1px 0 0 rgb(241 245 249)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #14b8a6)" }}
          >
            R
          </div>
          <div>
            <span className="font-bold text-primary-900 text-sm">리얼레코드</span>
            <span className="text-slate-400 text-sm font-medium"> · 창부이 데이터랩</span>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-slate-500">
          <Link
            href="/"
            className={
              pathname === "/"
                ? "text-primary-700 font-semibold"
                : "hover:text-slate-900 transition-colors"
            }
          >
            대시보드
          </Link>
          <Link
            href="/map"
            className={`flex items-center gap-1 ${
              pathname === "/map"
                ? "text-primary-700 font-semibold"
                : "hover:text-slate-900 transition-colors"
            }`}
          >
            <MapPin size={13} />
            지도 검색
          </Link>
        </nav>
      </div>
    </header>
  );
}
