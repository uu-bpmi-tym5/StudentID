import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const scanPayloadSchema = z.object({
  tapper_id: z.string().min(1),
  card_uid: z.string().min(1),
  timestamp: z.number().int().positive(),
});

/**
 * POST /api/scan
 *
 * Webhook called by firmware/broker.py when a tag scan event occurs.
 * Authenticated via shared secret in the Authorization header.
 *
 * Flow:
 * 1. Validate webhook secret
 * 2. Parse + validate payload
 * 3. Resolve card_uid -> profile
 * 4. Find active event for this tapper
 * 5. Insert attendance_log
 * 6. Return feedback pattern for the tapper
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate webhook
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SCAN_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== "Bearer " + expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scanPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tapper_id, card_uid, timestamp } = parsed.data;
  const scanned_at = new Date(timestamp * 1000).toISOString();
  const supabase = createAdminClient();

  // 3. Resolve card -> profile
  const { data: card } = await supabase
    .from("nfc_cards")
    .select("profile_id")
    .eq("card_uid", card_uid)
    .eq("is_active", true)
    .single();

  // 4. Find active event for this tapper
  const { data: activeEvent } = await supabase
    .from("events")
    .select("id")
    .eq("tapper_id", tapper_id)
    .eq("is_active", true)
    .lte("starts_at", scanned_at)
    .gte("ends_at", scanned_at)
    .single();

  // 5. Insert attendance log
  const { error: insertError } = await supabase.from("attendance_logs").insert({
    tapper_id,
    card_uid,
    scanned_at,
    profile_id: card?.profile_id ?? null,
    event_id: activeEvent?.id ?? null,
  });

  if (insertError) {
    console.error("Failed to insert attendance log:", insertError);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }

  // 6. Determine feedback
  let visual = "p1/red";
  let acoustic = "p1";

  if (card?.profile_id && activeEvent?.id) {
    visual = "p1/green";  // known student, active event
  } else if (card?.profile_id) {
    visual = "p1/yellow"; // known student, no active event
  }
  // else: unknown card -> red

  return NextResponse.json({
    status: "ok",
    visual,
    acoustic,
    profile_id: card?.profile_id ?? null,
    event_id: activeEvent?.id ?? null,
  });
}
