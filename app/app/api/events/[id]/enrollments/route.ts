import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/auth";

const enrollSchema = z.object({
  profile_id: z.string().uuid(),
});

/**
 * GET /api/events/[id]/enrollments
 * Returns all enrolled profiles for an event. Staff only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_enrollments")
    .select("*, profiles(id, full_name, email, student_id)")
    .eq("event_id", id);

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/events/[id]/enrollments
 * Staff: enroll any student.
 * Student: enroll themselves only if event.allow_self_enrollment = true.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Resolve caller role
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = callerProfile?.role ?? "student";
  const isStaff = role === "admin" || role === "teacher";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { profile_id } = parsed.data;

  // Students can only enroll themselves
  if (!isStaff) {
    if (profile_id !== user.id) {
      return NextResponse.json(
        { error: "Students may only enroll themselves" },
        { status: 403 }
      );
    }

    // Check event allows self-enrollment
    const { data: event } = await supabase
      .from("events")
      .select("allow_self_enrollment")
      .eq("id", id)
      .single();

    if (!event?.allow_self_enrollment) {
      return NextResponse.json(
        { error: "This event does not allow self-enrollment" },
        { status: 403 }
      );
    }
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("event_enrollments")
    .select("id")
    .eq("event_id", id)
    .eq("profile_id", profile_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Student is already enrolled" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("event_enrollments")
    .insert({ event_id: id, profile_id })
    .select("*, profiles(id, full_name, email, student_id)")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

