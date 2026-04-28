"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { Info } from "lucide-react";
import type { PriceHistoryPoint } from "@/types/api";
import { formatManwon } from "@/lib/utils/formatPrice";

type RangeKey = "1y" | "3y" | "5y" | "all";
type AnnotatedPoint = PriceHistoryPoint & { isOutlier: boolean };

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1y", label: "1년" },
  { key: "3y", label: "3년" },
  { key: "5y", label: "5년" },
  { key: "all", label: "전체" },
];

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function markOutliers(points: PriceHistoryPoint[]): AnnotatedPoint[] {
  const byArea = new Map<number, number[]>();
  for (const p of points) {
    const arr = byArea.get(p.areaPyeong) ?? [];
    arr.push(p.priceManwon);
    byArea.set(p.areaPyeong, arr);
  }
  return points.map((p) => {
    const values = byArea.get(p.areaPyeong) ?? [];
    const median = getMedian(values);
    const isOutlier =
      values.length >= 3 && Math.abs(p.priceManwon - median) / median > 0.35;
    return { ...p, isOutlier };
  });
}

function getCutoffDate(range: RangeKey): Date | null {
  if (range === "all") return null;
  const years = range === "1y" ? 1 : range === "3y" ? 3 : 5;
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

// Orange X for outlier points; teal dot otherwise
const OutlierDot = (props: {
  cx?: number;
  cy?: number;
  payload?: AnnotatedPoint;
}) => {
  const { cx = 0, cy = 0, payload } = props;
  if (payload?.isOutlier) {
    return (
      <g>
        <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#f97316" strokeWidth={2} />
        <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} stroke="#f97316" strokeWidth={2} />
      </g>
    );
  }
  return <Dot cx={cx} cy={cy} r={3} fill="#14b8a6" />;
};

function formatYAxis(value: number) {
  return `${(value / 10000).toFixed(1)}억`;
}

function formatXAxis(date: string) {
  const d = new Date(date);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface SmartChartProps {
  data: PriceHistoryPoint[];
  height?: number;
  selectedPyeong?: number;
}

export function SmartChart({ data, height = 300, selectedPyeong }: SmartChartProps) {
  const [range, setRange] = useState<RangeKey>("3y");
  const [hideOutliers, setHideOutliers] = useState(true);

  // Use the externally selected pyeong when provided; otherwise pick the most-traded area
  const topArea = useMemo(() => {
    if (selectedPyeong) return selectedPyeong;
    const counts = new Map<number, number>();
    for (const p of data) {
      counts.set(p.areaPyeong, (counts.get(p.areaPyeong) ?? 0) + 1);
    }
    let best = 0, bestCount = 0;
    for (const [area, count] of counts) {
      if (count > bestCount) { best = area; bestCount = count; }
    }
    return best;
  }, [data, selectedPyeong]);

  const rangeFiltered = useMemo(() => {
    const cutoff = getCutoffDate(range);
    return data
      .filter((p) => p.areaPyeong === topArea)
      .filter((p) => !cutoff || new Date(p.contractDate) >= cutoff)
      .sort((a, b) => a.contractDate.localeCompare(b.contractDate));
  }, [data, topArea, range]);

  const annotated = useMemo(() => markOutliers(rangeFiltered), [rangeFiltered]);

  // When toggle is ON, strip outliers for a smooth trend line
  const chartData = useMemo(
    () => (hideOutliers ? annotated.filter((p) => !p.isOutlier) : annotated),
    [annotated, hideOutliers]
  );

  // Not enough raw data to draw a meaningful chart
  if (rangeFiltered.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        충분한 데이터가 쌓이지 않았습니다
      </div>
    );
  }

  // All points were stripped as outliers — let the user recover
  if (chartData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 text-slate-400 text-sm"
        style={{ height }}
      >
        <p>AI 필터 적용 후 표시할 데이터가 없어요.</p>
        <button
          onClick={() => setHideOutliers(false)}
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2 transition-colors"
        >
          이상거래 포함하여 전체 보기
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                range === key
                  ? "bg-primary-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          {topArea > 0 && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md ml-1">
              {topArea}평 기준
            </span>
          )}
        </div>

        {/* AI outlier toggle with explanatory tooltip */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative group/aiinfo flex items-center gap-1">
            <span className="text-xs text-slate-500">AI 이상거래 숨기기</span>
            <Info size={12} className="text-slate-400 cursor-help flex-shrink-0" />
            <span className="absolute bottom-full right-0 mb-2 w-56 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs leading-relaxed opacity-0 pointer-events-none group-hover/aiinfo:opacity-100 transition-opacity duration-150 shadow-lg z-50">
              가족 간 직거래 및 특수 거래를 통계적으로 필터링한 결과입니다.
              <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900" />
            </span>
          </span>
          <button
            onClick={() => setHideOutliers((v) => !v)}
            aria-pressed={hideOutliers}
            className={`relative inline-flex w-10 h-6 rounded-full transition-colors focus:outline-none ${
              hideOutliers ? "bg-teal-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                hideOutliers ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="contractDate"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const price = Number(payload[0].value);
              const currentDate = new Date(label as string);
              const prevMonthDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 1,
                1
              );

              // Compare against same-area data from the previous calendar month
              const prevPoints = chartData.filter((p) => {
                const d = new Date(p.contractDate);
                return (
                  d.getFullYear() === prevMonthDate.getFullYear() &&
                  d.getMonth() === prevMonthDate.getMonth()
                );
              });

              let changeText: string | null = null;
              if (prevPoints.length > 0 && price > 0) {
                const prevAvg =
                  prevPoints.reduce((s, p) => s + p.priceManwon, 0) / prevPoints.length;
                const pct = ((price - prevAvg) / prevAvg) * 100;
                const abs = Math.abs(pct);
                if (abs >= 0.5) {
                  changeText =
                    pct > 0
                      ? `전월 대비 ${abs.toFixed(1)}% 상승했어요 📈`
                      : `전월 대비 ${abs.toFixed(1)}% 하락했어요 📉`;
                }
              }

              return (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg px-4 py-3">
                  <p className="text-xs text-slate-400 mb-1.5">
                    {currentDate.toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{formatManwon(price)}</p>
                  {changeText && (
                    <p className="text-xs text-slate-500 mt-1.5 font-medium">{changeText}</p>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="priceManwon"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={hideOutliers ? false : <OutlierDot />}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
