import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const pairCardSchema = z.object({
  card_uid: z.string().min(1),
  profile_id: z.string().uuid(),
  label: z.string().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

/**
 * GET /api/cards
 * Returns all paired NFC cards with their linked profile.
 */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nfc_cards")
    .select("*, profiles(id, full_name, email, student_id, role)")
    .order("registered_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/cards
 * Pairs a new NFC card UID to a student / teacher profile.
 * Body: { card_uid, profile_id, label? }
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pairCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { card_uid, profile_id, label } = parsed.data;
  const admin = createAdminClient();

  // Reject if card UID already registered
  const { data: existing } = await admin
    .from("nfc_cards")
    .select("id")
    .eq("card_uid", card_uid)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Card UID is already paired to a profile" },
      { status: 409 }
    );
  }

  const { data, error } = await admin
    .from("nfc_cards")
    .insert({ card_uid, profile_id, label: label ?? null })
    .select("*, profiles(id, full_name, email, student_id, role)")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

