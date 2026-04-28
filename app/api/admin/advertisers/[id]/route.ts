import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/admin/advertisers/[id] — 광고주 정보 수정 + 단지 매칭 추가
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, phone, linkUrl, isActive, addComplexId, removeComplexId } = body as {
      name?: string;
      phone?: string;
      linkUrl?: string;
      isActive?: boolean;
      addComplexId?: string;
      removeComplexId?: string;
    };

    if (addComplexId) {
      await prisma.apartmentAdvertiser.upsert({
        where: { advertiserId_complexId: { advertiserId: id, complexId: addComplexId } },
        create: { advertiserId: id, complexId: addComplexId },
        update: {},
      });
    }

    if (removeComplexId) {
      await prisma.apartmentAdvertiser.deleteMany({
        where: { advertiserId: id, complexId: removeComplexId },
      });
    }

    const updated = await prisma.advertiser.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        apartments: {
          include: {
            complex: {
              select: { id: true, name: true, city: true, dong: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ advertiser: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/advertisers/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/advertisers/[id] — 광고주 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.apartmentAdvertiser.deleteMany({ where: { advertiserId: id } });
    await prisma.advertiser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/advertisers/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
