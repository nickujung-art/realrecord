import type { Metadata } from "next";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { ApartmentMap } from "@/components/map/ApartmentMap";

export const metadata: Metadata = {
  title: "지도 검색 | 리얼레코드",
};

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen">
      <GlobalHeader />
      <div className="flex-1 min-h-0">
        <ApartmentMap />
      </div>
    </div>
  );
}
