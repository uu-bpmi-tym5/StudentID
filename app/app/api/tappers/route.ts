import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createTapperSchema = z.object({
  id:       z.string().min(1).regex(/^[a-z0-9:.-]+$/, "Use lowercase letters, digits, hyphens, dots, or colons only"),
  name:     z.string().min(1),
  location: z.string().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

/**
 * GET /api/tappers
 * Returns all registered tappers.
 */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tappers")
    .select("*")
    .order("id");

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/tappers
 * Registers a new tapper device (admin only).
 * Body: { id, name, location? }
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

  const parsed = createTapperSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, name, location } = parsed.data;
  const admin = createAdminClient();

  // Reject duplicate IDs
  const { data: existing } = await admin
    .from("tappers")
    .select("id")
    .eq("id", id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Tapper ID already exists" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("tappers")
    .insert({ id, name, location: location ?? null, is_online: false })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
