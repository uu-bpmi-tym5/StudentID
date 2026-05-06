import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Attendance" };

type EventType = Database["public"]["Enums"]["event_type"];

const TYPE_VARIANTS: Record<
  EventType,
  "destructive" | "default" | "secondary" | "outline"
> = {
  exam: "destructive",
  lecture: "default",
  lab: "secondary",
  other: "outline",
};

export default async function MyAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profileId = user.id;

  const [{ data: logs }, { data: enrollments }] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("*, events(id, title, type, starts_at)")
      .eq("profile_id", profileId)
      .order("scanned_at", { ascending: false }),
    supabase
      .from("event_enrollments")
      .select("event_id, events(id, starts_at)")
      .eq("profile_id", profileId),
  ]);

  // Compute stats
  const enrolledCount = enrollments?.length ?? 0;
  const attendedEventIds = new Set(
    (logs ?? []).filter((l) => l.event_id).map((l) => l.event_id!)
  );
  const attendedCount = attendedEventIds.size;
  const overallRate =
    enrolledCount > 0
      ? ((attendedCount / enrolledCount) * 100).toFixed(1) + "%"
      : "—";

  // Compute streak: walk enrollments sorted most recent first
  const sortedEnrollments = [...(enrollments ?? [])].sort((a, b) => {
    const aDate = (a.events as { starts_at?: string } | null)?.starts_at ?? "";
    const bDate = (b.events as { starts_at?: string } | null)?.starts_at ?? "";
    return bDate.localeCompare(aDate);
  });

  let currentStreak = 0;
  for (const enrollment of sortedEnrollments) {
    if (attendedEventIds.has(enrollment.event_id)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your attendance record across all events"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall Rate
            </span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {overallRate}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Events Attended
            </span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {attendedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Streak
            </span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {currentStreak}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                events
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                No attendance records yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Make sure your NFC card is set up and associated with your
                account.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tapper</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const event = Array.isArray(log.events)
                    ? log.events[0]
                    : log.events;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {event ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/events/${event.id}`}
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {(event as { title?: string }).title}
                            </Link>
                            {(event as { type?: EventType }).type && (
                              <Badge
                                variant={
                                  TYPE_VARIANTS[
                                    (event as { type: EventType }).type
                                  ]
                                }
                                className="capitalize text-xs"
                              >
                                {(event as { type: EventType }).type}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">
                            No event
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.scanned_at), "dd MMM yyyy · HH:mm")}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                          {log.tapper_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className="bg-green-600/10 text-green-700 hover:bg-green-600/20 border-green-600/20"
                        >
                          Present
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
