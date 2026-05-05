"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Database["public"]["Views"]["event_attendance_summary"]["Row"];
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

const TYPE_FILTERS: Array<{ label: string; value: EventType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Exam", value: "exam" },
  { label: "Lecture", value: "lecture" },
  { label: "Lab", value: "lab" },
  { label: "Other", value: "other" },
];

interface Props {
  /** All events visible to the student (staff-enrolled + self-enrollable) */
  events: EventSummary[];
  /** Set of event IDs the student is currently enrolled in */
  enrolledEventIds: Set<string>;
  profileId: string;
}

export function StudentEventsClient({
  events,
  enrolledEventIds: initialEnrolledIds,
  profileId,
}: Props) {
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(initialEnrolledIds);
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [query, setQuery] = useState("");
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const now = new Date();

  const filtered = events.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (query && !(e.title ?? "").toLowerCase().includes(query.toLowerCase())) return false;
    if (showEnrolledOnly && !enrolledIds.has(e.event_id ?? "")) return false;
    return true;
  });

  function handleEnroll(eventId: string) {
    setPendingId(eventId);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId }),
      });
      setPendingId(null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Enrollment failed", { description: err.error });
        return;
      }
      setEnrolledIds((prev) => new Set([...prev, eventId]));
      toast.success("You're enrolled!");
    });
  }

  function handleUnenroll(eventId: string) {
    setPendingId(eventId);
    startTransition(async () => {
      const res = await fetch(
        `/api/events/${eventId}/enrollments/${profileId}`,
        { method: "DELETE" }
      );
      setPendingId(null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to unenroll", { description: err.error });
        return;
      }
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      toast.success("Unenrolled from event");
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Type tabs */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Enrolled-only toggle */}
          <button
            type="button"
            onClick={() => setShowEnrolledOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              showEnrolledOnly
                ? "bg-green-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Check className="h-3 w-3" />
            Enrolled only
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 text-sm"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Event cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-muted-foreground">
              No events found
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {showEnrolledOnly
                ? "You're not enrolled in any events yet."
                : "No events match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            if (!event.event_id) return null;
            const isEnrolled = enrolledIds.has(event.event_id);
            const canSelfManage = event.allow_self_enrollment === true;
            const isUpcoming = event.ends_at ? new Date(event.ends_at) > now : false;
            const isLoading = isPending && pendingId === event.event_id;

            return (
              <div
                key={event.event_id}
                className={`relative rounded-lg border bg-card p-4 shadow-sm transition-all ${
                  isEnrolled ? "border-green-500/40 bg-green-50/5" : ""
                }`}
              >
                {/* Enrolled badge */}
                {isEnrolled && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" />
                    Enrolled
                  </span>
                )}

                <div className="space-y-2 pr-16">
                  {/* Title + type */}
                  <div className="flex flex-wrap items-center gap-2">
                    {event.type && (
                      <Badge
                        variant={TYPE_VARIANTS[event.type]}
                        className="capitalize text-xs shrink-0"
                      >
                        {event.type}
                      </Badge>
                    )}
                    {isUpcoming ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        Upcoming
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Past</span>
                    )}
                  </div>

                  <p className="text-sm font-semibold leading-tight">
                    {event.title}
                  </p>

                  {/* Date */}
                  {event.starts_at && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(event.starts_at), "dd MMM yyyy · HH:mm")}
                      {event.ends_at && (
                        <> → {format(new Date(event.ends_at), "HH:mm")}</>
                      )}
                    </p>
                  )}

                  {/* Tapper */}
                  <p className="text-xs text-muted-foreground">
                    Tapper:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">
                      {event.tapper_id}
                    </code>
                  </p>

                  {/* Enrollment count */}
                  <p className="text-xs text-muted-foreground">
                    {event.enrolled_count ?? 0} enrolled
                  </p>
                </div>

                {/* Action */}
                <div className="mt-3 flex gap-2">
                  {isEnrolled ? (
                    canSelfManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-destructive/30 text-destructive text-xs hover:bg-destructive/10"
                        disabled={isLoading}
                        onClick={() => handleUnenroll(event.event_id!)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Unenroll"
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Enrolled by staff
                      </span>
                    )
                  ) : canSelfManage ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleEnroll(event.event_id!)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Enroll"
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

