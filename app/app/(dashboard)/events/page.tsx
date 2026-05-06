import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventsPageClient } from "@/components/events/events-page-client";
import { StudentEventsClient } from "@/components/events/student-events-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
};

export default async function EventsPage() {
  const supabase = await createClient();

  // Determine caller role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const isStudent = profile?.role === "student";

  if (isStudent) {
    // Fetch all events the student can see:
    // 1. Events with allow_self_enrollment = true (can browse + self-manage)
    // 2. Events the student is already enrolled in (staff-enrolled, read-only)
    const [{ data: allEvents }, { data: enrollments }] = await Promise.all([
      supabase
        .from("event_attendance_summary")
        .select("*")
        .order("starts_at", { ascending: false }),
      supabase
        .from("event_enrollments")
        .select("event_id")
        .eq("profile_id", profile!.id),
    ]);

    const enrolledIds = new Set(
      (enrollments ?? []).map((e) => e.event_id)
    );

    // Show: enrollable events + events they're already in
    const visibleEvents = (allEvents ?? []).filter(
      (e) => e.allow_self_enrollment || enrolledIds.has(e.event_id ?? "")
    );

    return (
      <div className="space-y-6">
        <PageHeader
          title="Events"
          description="Browse and enroll in upcoming events"
        />
        <StudentEventsClient
          events={visibleEvents}
          enrolledEventIds={enrolledIds}
          profileId={profile!.id}
        />
      </div>
    );
  }

  // Staff view — full management
  const { data: events } = await supabase
    .from("event_attendance_summary")
    .select("*")
    .order("starts_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Manage lectures, exams, and lab sessions"
      >
        <Button render={<Link href="/events/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </PageHeader>

      <EventsPageClient initial={events ?? []} />
    </div>
  );
}

