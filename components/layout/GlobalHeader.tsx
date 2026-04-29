"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, LayoutDashboard } from "lucide-react";

export function GlobalHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">리얼레코드</span>
              <span className="text-gray-500 text-sm font-medium"> · 창부이 데이터랩</span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-500">
            <Link
              href="/"
              className={
                pathname === "/"
                  ? "text-gray-900 font-semibold"
                  : "hover:text-gray-700 transition-colors duration-150"
              }
            >
              대시보드
            </Link>
            <Link
              href="/map"
              className={`flex items-center gap-1 ${
                pathname === "/map"
                  ? "text-gray-900 font-semibold"
                  : "hover:text-gray-700 transition-colors duration-150"
              }`}
            >
              <MapPin size={13} strokeWidth={1.5} />
              지도 검색
            </Link>
          </nav>
        </div>
      </header>

      {/* 모바일 하단 탭바 */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="grid grid-cols-2">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 py-3 ${
              pathname === "/" ? "text-primary-700" : "text-neutral-500"
            }`}
          >
            <LayoutDashboard size={20} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">대시보드</span>
          </Link>
          <Link
            href="/map"
            className={`flex flex-col items-center justify-center gap-1 py-3 ${
              pathname === "/map" ? "text-primary-700" : "text-neutral-500"
            }`}
          >
            <MapPin size={20} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">지도 검색</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
