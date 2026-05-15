import { NextResponse } from "next/server";
import { cacheClear, envelope } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  const cleared = cacheClear();
  return NextResponse.json(
    envelope({
      data: { cleared: true, count: cleared },
      status: "live",
      provider: "internal",
    }),
  );
}

export async function GET() {
  return NextResponse.json(
    envelope({
      data: { cleared: false, hint: "Use POST to clear cache" },
      status: "live",
      provider: "internal",
    }),
  );
}
