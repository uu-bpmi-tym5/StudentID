import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * DELETE /api/cards/[id]
 * Permanently removes an NFC card pairing.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin.from("nfc_cards").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * PATCH /api/cards/[id]
 * Toggle a card's is_active status.
 * Body: { is_active: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("nfc_cards")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("*, profiles(id, full_name, email, student_id, role)")
    .single();

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

