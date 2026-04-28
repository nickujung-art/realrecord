import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const swLat = parseFloat(searchParams.get('swLat') || '0');
    const neLat = parseFloat(searchParams.get('neLat') || '0');
    const swLng = parseFloat(searchParams.get('swLng') || '0');
    const neLng = parseFloat(searchParams.get('neLng') || '0');

    console.log(`📡 검색 범위: Lat(${swLat}~${neLat}), Lng(${swLng}~${neLng})`);

    const rows = await prisma.apartmentComplex.findMany({
      where: {
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });

    const complexes = rows
      .map((c) => ({
        id: c.id,
        name: c.name,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
      }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

    console.log(`✅ 검색된 단지 수: ${complexes.length}개`);

    return NextResponse.json({ complexes });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ API 에러 발생:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
