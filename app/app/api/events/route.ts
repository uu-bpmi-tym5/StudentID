import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/auth";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["exam", "lecture", "lab", "other"]),
  tapper_id: z.string().min(1, "Tapper is required"),
  starts_at: z.string().min(1, "Start time is required"),
  ends_at: z.string().min(1, "End time is required"),
  description: z.string().optional(),
  allow_self_enrollment: z.boolean().optional().default(false),
});

/**
 * GET /api/events
 * Returns all events from event_attendance_summary view.
 */
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_attendance_summary")
    .select("*")
    .order("starts_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/events
 * Creates a new event.
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, type, tapper_id, starts_at, ends_at, description, allow_self_enrollment } =
    parsed.data;

  // Validate ends_at is after starts_at
  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json(
      { error: "ends_at must be after starts_at" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Reject if another event on the same tapper overlaps this time window
  const { data: conflicts } = await supabase
    .from("events")
    .select("id")
    .eq("tapper_id", tapper_id)
    .lt("starts_at", ends_at)
    .gt("ends_at", starts_at)
    .limit(1);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: "This tapper already has an event during that time window" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      type,
      tapper_id,
      starts_at,
      ends_at,
      description: description ?? null,
      allow_self_enrollment: allow_self_enrollment ?? false,
      created_by: staff.user.id,
    })
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

