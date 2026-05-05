import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceRateChart } from "@/components/analytics/attendance-rate-chart";
import { AttendanceTrendChart } from "@/components/analytics/attendance-trend-chart";
import { ExportButton } from "@/components/analytics/export-button";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: eventSummary }, { data: trendData }] = await Promise.all([
    supabase
      .from("event_attendance_summary")
      .select("*")
      .order("starts_at", { ascending: false }),
    supabase
      .from("attendance_logs")
      .select("scanned_at")
      .gte("scanned_at", thirtyDaysAgo)
      .order("scanned_at"),
  ]);

  const eventsForExport = (eventSummary ?? []).map((e) => ({
    event_id: e.event_id,
    title: e.title,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Attendance trends, charts, and exports"
      >
        <ExportButton events={eventsForExport} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Attendance Rate by Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceRateChart data={eventSummary ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Scan Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trendData ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
