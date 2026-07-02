import { NextResponse, type NextRequest } from "next/server";
import { runSupabaseScheduledNotifications } from "@/lib/server/scheduled-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const cronHeader = request.headers.get("x-cron-secret") ?? "";

  return authorization === `Bearer ${cronSecret}` || cronHeader === cronSecret;
}

async function handleCron(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runSupabaseScheduledNotifications();
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ ok: false, error: "Scheduled notifications could not be processed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
