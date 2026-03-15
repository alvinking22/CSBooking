import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, message: "Faltan parámetros" }, { status: 400 });
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ success: false, message: "Formato de fecha inválido" }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        sessionDate: {
          gte: parsedStart,
          lte: parsedEnd,
        },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true,
        studioId: true,
      },
    });

    // Serialize dates for JSON
    const serialized = bookings.map((b) => ({
      sessionDate: b.sessionDate.toISOString().slice(0, 10),
      startTime: b.startTime,
      endTime: b.endTime,
      studioId: b.studioId,
    }));

    return NextResponse.json(
      { success: true, data: { bookings: serialized } },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (err) {
    console.error("[calendar API error]", err);
    return NextResponse.json({ success: false, message: "Error" }, { status: 500 });
  }
}
