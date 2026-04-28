import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const advertisers = await prisma.advertiser.findMany({
      orderBy: { createdAt: "desc" },
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
    return NextResponse.json({ advertisers });
  } catch (error) {
    console.error("[GET /api/admin/advertisers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, linkUrl, complexIds } = body as {
      name: string;
      phone?: string;
      linkUrl?: string;
      complexIds?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "상호명은 필수입니다." }, { status: 400 });
    }

    const advertiser = await prisma.advertiser.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
        apartments: complexIds?.length
          ? {
              create: complexIds.map((complexId) => ({ complexId })),
            }
          : undefined,
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

    return NextResponse.json({ advertiser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/advertisers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
