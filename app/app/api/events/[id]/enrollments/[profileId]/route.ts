import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/auth";

/**
 * DELETE /api/events/[id]/enrollments/[profileId]
 * Staff: unenroll any student.
 * Student: unenroll themselves only if event.allow_self_enrollment = true.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, profileId } = await params;

  // Check staff first
  const staff = await requireStaff();
  if (!staff) {
    // Might be a student — check self-unenroll rules
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Students can only remove themselves
    if (profileId !== user.id) {
      return NextResponse.json(
        { error: "Students may only unenroll themselves" },
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

  const { error } = await supabase
    .from("event_enrollments")
    .delete()
    .eq("event_id", id)
    .eq("profile_id", profileId);

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

