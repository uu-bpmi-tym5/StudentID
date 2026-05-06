import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { LocalDateTime } from "@/components/shared/local-date-time";
import { EventAttendanceFeed } from "@/components/events/event-attendance-feed";
import { EnrollmentManager } from "@/components/events/enrollment-manager";
import { DeleteEventDetailsActions } from "@/components/events/delete-event-details-actions";
import type { Database } from "@/lib/supabase/types";

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

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();
  return { title: data?.title ?? "Event Detail" };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const [
    { data: eventData, error: eventError },
    { data: enrollments },
    { data: logs },
    { data: allStudents },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*, tappers(id, name), profiles!events_created_by_fkey(full_name)")
      .eq("id", eventId)
      .single(),
    supabase
      .from("event_enrollments")
      .select("*, profiles(id, full_name, email, student_id)")
      .eq("event_id", eventId),
    supabase
      .from("attendance_logs")
      .select("*, profiles(full_name, student_id)")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, full_name, email, student_id")
      .eq("role", "student")
      .order("full_name"),
  ]);

  if (eventError || !eventData) {
    notFound();
  }

  // Students don't get the management detail view — redirect to their events page
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (currentUser) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    if (currentProfile?.role === "student") {
      const { redirect } = await import("next/navigation");
      redirect("/events");
    }
  }

  const event = eventData;
  const tapper = Array.isArray(event.tappers) ? event.tappers[0] : event.tappers;
  const createdBy = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
  const now = new Date();
  const isActive = new Date(event.ends_at) > now;

  return (
    <div className="space-y-6">
      <PageHeader title={event.title} description={`Event · ${eventId.slice(0, 8)}`}>
        <Button variant="ghost" size="sm" render={<Link href="/events" />}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          All Events
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Event Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
                {event.type && (
                  <Badge variant={TYPE_VARIANTS[event.type]} className="capitalize shrink-0">
                    {event.type}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tapper</span>
                  <span>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      {tapper?.id ?? event.tapper_id}
                    </code>
                    {tapper?.name && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {tapper.name}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starts</span>
                  <span className="tabular-nums text-xs">
                    <LocalDateTime iso={event.starts_at} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ends</span>
                  <span className="tabular-nums text-xs">
                    <LocalDateTime iso={event.ends_at} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusIndicator
                    variant={isActive ? "online" : "offline"}
                    label={isActive ? "Active" : "Past"}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Self-enrollment</span>
                  <Badge
                    variant={event.allow_self_enrollment ? "default" : "outline"}
                    className="text-xs"
                  >
                    {event.allow_self_enrollment ? "Enabled" : "Staff only"}
                  </Badge>
                </div>
                {createdBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created by</span>
                    <span className="text-xs">{(createdBy as { full_name: string }).full_name}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  render={<Link href={`/events/${eventId}/edit`} />}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <DeleteEventDetailsActions
                  eventId={eventId}
                  eventTitle={event.title}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Feed + Enrollment */}
        <div className="lg:col-span-2 space-y-4">
          <EventAttendanceFeed eventId={eventId} initial={logs ?? []} />
          <EnrollmentManager
            eventId={eventId}
            initial={enrollments ?? []}
            allStudents={allStudents ?? []}
          />
        </div>
      </div>
    </div>
  );
}
