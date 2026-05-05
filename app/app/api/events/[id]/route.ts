import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/auth";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["exam", "lecture", "lab", "other"]).optional(),
  tapper_id: z.string().min(1).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  allow_self_enrollment: z.boolean().optional(),
});

/**
 * GET /api/events/[id]
 * Returns a single event with enrollments and last 50 attendance logs.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event, error: eventError }, { data: enrollments }, { data: logs }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*, tappers(id, name), profiles!events_created_by_fkey(full_name)")
        .eq("id", id)
        .single(),
      supabase
        .from("event_enrollments")
        .select("*, profiles(id, full_name, email, student_id)")
        .eq("event_id", id),
      supabase
        .from("attendance_logs")
        .select("*, profiles(full_name, student_id)")
        .eq("event_id", id)
        .order("scanned_at", { ascending: false })
        .limit(50),
    ]);

  if (eventError || !event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event, enrollments: enrollments ?? [], logs: logs ?? [] });
}

/**
 * PATCH /api/events/[id]
 * Partial update of event fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  // Check event exists and ownership
  const { data: event } = await supabase
    .from("events")
    .select("created_by, tapper_id, starts_at, ends_at")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (staff.role !== "admin" && event.created_by !== staff.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check tapper overlap, merging incoming values with existing ones, excluding self
  const effectiveTapperId = parsed.data.tapper_id ?? event.tapper_id;
  const effectiveStartsAt = parsed.data.starts_at ?? event.starts_at;
  const effectiveEndsAt = parsed.data.ends_at ?? event.ends_at;

  if (effectiveStartsAt && effectiveEndsAt) {
    const { data: conflicts } = await supabase
      .from("events")
      .select("id")
      .eq("tapper_id", effectiveTapperId)
      .lt("starts_at", effectiveEndsAt)
      .gt("ends_at", effectiveStartsAt)
      .neq("id", id)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This tapper already has an event during that time window" },
        { status: 409 }
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/events/[id]
 * Deletes an event (admin or owner only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (staff.role !== "admin" && event.created_by !== staff.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

