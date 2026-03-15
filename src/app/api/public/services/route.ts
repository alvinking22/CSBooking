import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  try {
    const services = await prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(
      { success: true, data: { services: serializePrisma(services) } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ success: false, message: "Error" }, { status: 500 });
  }
}
