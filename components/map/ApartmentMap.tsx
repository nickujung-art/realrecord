"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import { MarkerOverlay, getZoneLevel } from "./MarkerOverlay";
import { BottomSheetSummary } from "./BottomSheetSummary";
import type { BoundsComplexItem } from "@/types/api";

// ── 상수 ──────────────────────────────────────────────────────────
const CHANGWON_CENTER = { lat: 35.228, lng: 128.681 };
const INITIAL_ZOOM = 7;
const DEBOUNCE_MS = 300;

// ── 폴백 UI ───────────────────────────────────────────────────────
function MapFallback({ message }: { message?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">{message ?? "지도를 불러오는 중…"}</p>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function ApartmentMap() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ?? "";
  const [loadingSDK, sdkError] = useKakaoLoader({ appkey });

  const [complexes, setComplexes] = useState<BoundsComplexItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);

  // ── Bottom Sheet 상태 ──────────────────────────────────────────
  // selectedComplex: 마커 클릭 시 세팅. null이면 시트 닫힘.
  const [selectedComplex, setSelectedComplex] = useState<BoundsComplexItem | null>(null);

  const handleMarkerSelect = useCallback((complex: BoundsComplexItem) => {
    setSelectedComplex(complex);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedComplex(null);
  }, []);

  // AbortController ref: 이전 요청 취소용
  const abortRef = useRef<AbortController | null>(null);
  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API 호출 ────────────────────────────────────────────────────
  const fetchComplexes = useCallback(
    (swLat: number, swLng: number, neLat: number, neLng: number, zoom: number) => {
      // 이전 debounce 타이머 취소
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        // 이전 진행 중인 요청 취소
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setFetching(true);
        try {
          const qs = new URLSearchParams({
            swLat: String(swLat),
            swLng: String(swLng),
            neLat: String(neLat),
            neLng: String(neLng),
            zoomLevel: String(zoom),
          });

          const res = await fetch(`/api/complexes/within-bounds?${qs}`, {
            signal: abortRef.current.signal,
          });

          if (!res.ok) return;

          const data = (await res.json()) as { complexes: BoundsComplexItem[] };
          setComplexes(data.complexes ?? []);
        } catch (err) {
          // AbortError는 정상 취소이므로 무시
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("지도 데이터 로드 실패:", err);
        } finally {
          setFetching(false);
        }
      }, DEBOUNCE_MS);
    },
    []
  );

  // ── 지도 이벤트 핸들러 ─────────────────────────────────────────
  const handleBoundsChanged = useCallback(
    (map: kakao.maps.Map) => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const currentZoom = map.getLevel();

      setZoomLevel(currentZoom);
      fetchComplexes(sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng(), currentZoom);
    },
    [fetchComplexes]
  );

  // 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── SDK 로드 상태 처리 ─────────────────────────────────────────
  if (!appkey) {
    return (
      <MapFallback message="카카오 지도 API 키가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_MAP_API_KEY를 추가하세요." />
    );
  }
  if (sdkError) {
    return (
      <MapFallback message="카카오 지도를 불러오지 못했습니다. API 키와 허용 도메인을 확인하세요." />
    );
  }
  if (loadingSDK) return <MapFallback />;

  const zone = getZoneLevel(zoomLevel);

  // ── 렌더링 ────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      <Map
        center={CHANGWON_CENTER}
        level={INITIAL_ZOOM}
        style={{ width: "100%", height: "100%" }}
        onBoundsChanged={handleBoundsChanged}
      >
        {complexes.map((c) => (
          <CustomOverlayMap
            key={c.id}
            position={{ lat: c.lat, lng: c.lng }}
            xAnchor={0.5}
            yAnchor={1}
            zIndex={c.mapPriorityScore > 0 ? 20 : 10}
          >
            <div style={{ pointerEvents: "none" }}>
              <MarkerOverlay
                complex={c}
                zoomLevel={zoomLevel}
                onSelect={() => handleMarkerSelect(c)}
              />
            </div>
          </CustomOverlayMap>
        ))}
      </Map>

      {/* 로딩 인디케이터 */}
      {fetching && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10
            flex items-center gap-1.5 px-3 py-1.5
            bg-white border border-gray-100 rounded-full shadow-sm
            text-xs text-gray-500 pointer-events-none"
        >
          <span
            className="w-3 h-3 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin"
            aria-hidden="true"
          />
          단지 검색 중
        </div>
      )}

      {/* Bottom Sheet — 마커 선택 시 슬라이드 업 */}
      {selectedComplex && (
        <BottomSheetSummary
          complexId={selectedComplex.id}
          initialData={{
            name: selectedComplex.name,
            representativePrice: selectedComplex.representativePrice,
            representativeArea: selectedComplex.representativeArea,
          }}
          onClose={handleSheetClose}
        />
      )}

      {/* 줌 레벨 디버그 뱃지 (개발 환경에서만) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-4 left-3 z-10 pointer-events-none">
          <span className="text-[10px] bg-gray-800/70 text-white px-2 py-0.5 rounded font-mono">
            zoom {zoomLevel} · {zone} · {complexes.length}개
          </span>
        </div>
      )}
    </div>
  );
}
