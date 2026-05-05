import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/auth";

/**
 * GET /api/export
 * Exports attendance logs as CSV.
 * Query params: event_id?, from?, to?
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const event_id = searchParams.get("event_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createClient();

  let query = supabase
    .from("attendance_logs")
    .select(
      "scanned_at, tapper_id, card_uid, profiles(full_name, student_id), events(title)"
    )
    .order("scanned_at", { ascending: false });

  if (event_id) {
    query = query.eq("event_id", event_id);
  }
  if (from) {
    query = query.gte("scanned_at", from);
  }
  if (to) {
    query = query.lte("scanned_at", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Build CSV
  const header = "scanned_at,student_name,student_id,card_uid,tapper_id,event_title\n";

  const rows = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const event = Array.isArray(row.events) ? row.events[0] : row.events;

    const studentName = (profile as { full_name?: string } | null)?.full_name ?? "";
    const studentId = (profile as { student_id?: string | null } | null)?.student_id ?? "";
    const eventTitle = (event as { title?: string } | null)?.title ?? "";

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

    return [
      escape(row.scanned_at),
      escape(studentName),
      escape(studentId),
      escape(row.card_uid),
      escape(row.tapper_id),
      escape(eventTitle),
    ].join(",");
  });

  const csv = header + rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="attendance-export.csv"',
    },
  });
}
