import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/export
 *
 * Export attendance data as CSV.
 * Requires authentication (will be enforced once Supabase is connected).
 */
export async function GET(request: NextRequest) {
  // TODO: Authenticate user, check role (admin/teacher)
  // TODO: Accept query params for event_id, date range, format (csv/pdf)
  // TODO: Query attendance_logs joined with profiles and events
  // TODO: Generate CSV/PDF and return

  return NextResponse.json(
    { error: "Not implemented yet" },
    { status: 501 }
  );
}
