import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createStudentSchema = z.object({
  full_name:  z.string().min(2),
  email:      z.string().email(),
  password:   z.string().min(6),
  student_id: z.string().optional(),
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
 * GET /api/students
 * Returns all student profiles with their NFC card status.
 */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, student_id, created_at, nfc_cards(id, is_active)")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/students
 * Creates a new student account (admin only).
 * Body: { full_name, email, password, student_id? }
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

  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { full_name, email, password, student_id } = parsed.data;
  const admin = createAdminClient();

  // Create auth user — email_confirm: true skips verification email
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });

  if (authError) {
    const status = authError.message.toLowerCase().includes("already") ? 409 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }

  const newUserId = authData.user.id;

  // Set student_id — the DB trigger doesn't handle this field
  if (student_id) {
    await admin
      .from("profiles")
      .update({ student_id })
      .eq("id", newUserId);
  }

  // Fetch and return the full profile row
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, email, student_id, created_at, nfc_cards(id, is_active)")
    .eq("id", newUserId)
    .single();

  if (profileError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(profile, { status: 201 });
}
