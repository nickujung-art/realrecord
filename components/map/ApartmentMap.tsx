"use client";

import { useState, useCallback, useEffect } from "react";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";

interface Complex {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function MapFallback({ message }: { message?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100">
      <p className="text-sm text-gray-400">{message ?? "지도를 불러오는 중…"}</p>
    </div>
  );
}

const CHANGWON_CENTER = { lat: 35.228, lng: 128.681 };
const INITIAL_LEVEL = 5;

export function ApartmentMap() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ?? "";
  const [loadingSDK, sdkError] = useKakaoLoader({ appkey });

  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [fetching, setFetching] = useState(false);

  const fetchComplexes = useCallback(
    async (swLat: number, swLng: number, neLat: number, neLng: number) => {
      setFetching(true);
      try {
        const qs = new URLSearchParams({
          swLat: String(swLat),
          swLng: String(swLng),
          neLat: String(neLat),
          neLng: String(neLng),
        });
        const res = await fetch(`/api/complexes/within-bounds?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { complexes: Complex[] };
        console.log("Map Data:", data);
        const valid = (data.complexes ?? []).filter(
          (c) => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))
        );
        setComplexes(valid);
      } catch {
        // 네트워크 오류 시 현재 마커 유지
      } finally {
        setFetching(false);
      }
    },
    []
  );

  const handleBoundsChanged = useCallback(
    (map: kakao.maps.Map) => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      fetchComplexes(sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng());
    },
    [fetchComplexes]
  );

  if (!appkey)
    return (
      <MapFallback message="카카오 지도 API 키가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_MAP_API_KEY를 추가하세요." />
    );
  if (sdkError)
    return (
      <MapFallback message="카카오 지도를 불러오지 못했습니다. API 키와 허용 도메인을 확인하세요." />
    );
  if (loadingSDK) return <MapFallback />;

  return (
    <div className="relative w-full h-full">
      <Map
        center={CHANGWON_CENTER}
        level={INITIAL_LEVEL}
        style={{ width: "100%", height: "100%" }}
        onBoundsChanged={handleBoundsChanged}
      >
        {complexes.length > 0 &&
          complexes.map((c) => (
            <CustomOverlayMap
              key={c.id}
              position={{ lat: Number(c.lat), lng: Number(c.lng) }}
              zIndex={10}
            >
              <a
                href={`/apartments/${c.id}`}
                className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded shadow"
              >
                {c.name}
              </a>
            </CustomOverlayMap>
          ))}
      </Map>

      {fetching && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10
            flex items-center gap-1.5 px-3 py-1.5
            bg-white border border-gray-100 rounded-full shadow-sm
            text-xs text-gray-500 pointer-events-none"
        >
          <span
            className="w-3 h-3 rounded-full border border-gray-300 border-t-gray-600 animate-spin"
            aria-hidden="true"
          />
          단지 검색 중
        </div>
      )}
    </div>
  );
}
