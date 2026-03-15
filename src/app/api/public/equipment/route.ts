import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") ?? undefined;
    const serviceId = searchParams.get("serviceId") ?? undefined;

    const items = await prisma.equipment.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    let result = items;
    if (studioId) {
      result = result.filter((e) => {
        const ids = e.studioIds as string[] | null;
        return !ids || ids.length === 0 || ids.includes(studioId);
      });
    }
    if (serviceId) {
      result = result.filter((e) => {
        const ids = e.serviceIds as string[] | null;
        return !ids || ids.length === 0 || ids.includes(serviceId);
      });
    }

    return NextResponse.json(
      { success: true, data: { equipment: serializePrisma(result) } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ success: false, message: "Error" }, { status: 500 });
  }
}
