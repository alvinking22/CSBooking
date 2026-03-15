import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/config";

export async function GET() {
  const config = await getPublicConfig();
  if (!config) {
    return NextResponse.json({ config: null }, { status: 404 });
  }
  return NextResponse.json({ config });
}
