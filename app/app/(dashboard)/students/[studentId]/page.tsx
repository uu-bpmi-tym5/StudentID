import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
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
import { CreditCard, Clock, ArrowLeft, TrendingUp, CalendarCheck, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

type Props = { params: Promise<{ studentId: string }> };

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();
  return { title: data?.full_name ?? "Student Profile" };
}

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createClient();

  const [profileRes, cardsRes, logsRes, enrollmentsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", studentId).single(),
    supabase
      .from("nfc_cards")
      .select("*")
      .eq("profile_id", studentId)
      .order("registered_at", { ascending: false }),
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, tapper_id, card_uid, event_id, events(id, title, type, starts_at)")
      .eq("profile_id", studentId)
      .order("scanned_at", { ascending: false }),
    supabase
      .from("event_enrollments")
      .select("event_id, events(id, starts_at)")
      .eq("profile_id", studentId),
  ]);

  if (!profileRes.data) notFound();

  const profile = profileRes.data;
  const cards = cardsRes.data ?? [];
  const logs = logsRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];

  // Compute stats (same logic as /my-attendance)
  const enrolledCount = enrollments.length;
  const attendedEventIds = new Set(
    logs.filter((l) => l.event_id).map((l) => l.event_id!)
  );
  const attendedCount = attendedEventIds.size;
  const overallRate =
    enrolledCount > 0
      ? ((attendedCount / enrolledCount) * 100).toFixed(1) + "%"
      : "—";

  // Streak: walk enrollments sorted most recent first
  const sortedEnrollments = [...enrollments].sort((a, b) => {
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
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/students" />}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Students
        </Button>
      </div>

      <PageHeader
        title={profile.full_name}
        description={`${profile.email}${profile.student_id ? ` · ID: ${profile.student_id}` : ""}`}
      />

      {/* Stat cards — mirrors what the student sees in /my-attendance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall Rate
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {overallRate}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {attendedCount} of {enrolledCount} enrolled events attended
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Events Attended
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {attendedCount}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {logs.length} total scans recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Streak
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {currentStreak}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                events
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Consecutive attended events
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold">Profile</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 font-mono text-xl font-bold text-primary">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student ID</span>
                {profile.student_id ? (
                  <Badge variant="outline">{profile.student_id}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span>{format(new Date(profile.created_at), "dd MMM yyyy")}</span>
              </div>
            </div>

            {/* NFC Cards */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  NFC Cards
                </span>
              </div>
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No cards assigned.{" "}
                  <a href="/cards" className="underline underline-offset-2 hover:text-foreground">
                    Assign one →
                  </a>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between rounded-md border px-2.5 py-1.5"
                    >
                      <code className="font-mono text-xs tracking-wide">{card.card_uid}</code>
                      <Badge
                        variant={card.is_active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {card.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance history — same data the student sees in /my-attendance */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Attendance History</CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {logs.length} scans
              </Badge>
            </div>
          </CardHeader>
          {logs.length === 0 ? (
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  No attendance records yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Make sure the student's NFC card is set up and associated with their account.
                </p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-t">
                    <TableHead className="pl-4">Event</TableHead>
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
                        <TableCell className="pl-4">
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
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
