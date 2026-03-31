import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/tappers/[id]/heartbeat
 *
 * Called by firmware/broker.py on every `event/boot` MQTT message.
 * Marks the tapper as online and updates last_seen_at.
 * Authenticated via the same shared secret as /api/scan.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SCAN_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tappers")
    .update({ is_online: true, last_seen_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Tapper not registered — still return 200 so the device isn't blocked
    console.warn(`Heartbeat from unknown tapper: ${id}`);
    return NextResponse.json({ status: "unknown_tapper" }, { status: 200 });
  }

  return NextResponse.json({ status: "ok", tapper: data });
}
