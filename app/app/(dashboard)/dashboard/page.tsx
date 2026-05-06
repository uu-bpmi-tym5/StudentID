import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import {
  CalendarDays,
  GraduationCap,
  Radio,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeEventsCount },
    { count: studentCount },
    { count: tappersOnlineCount },
    { data: attendanceSummary },
    { data: recentActivity },
    { data: trendData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("ends_at", now),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("tappers")
      .select("id", { count: "exact", head: true })
      .eq("is_online", true),
    supabase
      .from("event_attendance_summary")
      .select("attendance_pct")
      .not("attendance_pct", "is", null),
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, tapper_id, card_uid, profile_id, profiles(full_name)")
      .order("scanned_at", { ascending: false })
      .limit(10),
    supabase
      .from("attendance_logs")
      .select("scanned_at")
      .gte("scanned_at", sevenDaysAgo)
      .order("scanned_at"),
  ]);

  // Normalise profiles from Supabase (can be array or object) for the feed component
  const normalizedActivity = (recentActivity ?? []).map((log) => {
    const p = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
    return {
      id: log.id,
      scanned_at: log.scanned_at,
      tapper_id: log.tapper_id,
      card_uid: log.card_uid,
      profile_id: log.profile_id,
      profiles: p as { full_name: string } | null,
    };
  });

  const avgAttendance =
    attendanceSummary && attendanceSummary.length > 0
      ? (
          attendanceSummary.reduce(
            (sum, row) => sum + (row.attendance_pct ?? 0),
            0
          ) / attendanceSummary.length
        ).toFixed(1) + "%"
      : "—";

  const stats = [
    {
      label: "Active Events",
      value: activeEventsCount ?? 0,
      icon: CalendarDays,
    },
    {
      label: "Students",
      value: studentCount ?? 0,
      icon: GraduationCap,
    },
    {
      label: "Tappers Online",
      value: tappersOnlineCount ?? 0,
      icon: Radio,
    },
    {
      label: "Avg. Attendance",
      value: avgAttendance,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="System overview and real-time activity"
      />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity — live via Supabase realtime */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivityFeed initial={normalizedActivity} />
          </CardContent>
        </Card>

        {/* Attendance Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Attendance Trends (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <DashboardTrendChart data={trendData ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

