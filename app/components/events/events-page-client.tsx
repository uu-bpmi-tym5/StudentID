"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EventsTable } from "./events-table";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Database["public"]["Views"]["event_attendance_summary"]["Row"];
type EventType = Database["public"]["Enums"]["event_type"];

const TYPE_FILTERS: Array<{ label: string; value: EventType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Exam", value: "exam" },
  { label: "Lecture", value: "lecture" },
  { label: "Lab", value: "lab" },
  { label: "Other", value: "other" },
];

interface Props {
  initial: EventSummary[];
}

export function EventsPageClient({ initial }: Props) {
  const [events] = useState<EventSummary[]>(initial);
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = events.filter((e) => {
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    const matchesQuery =
      !query || (e.title ?? "").toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Filters row */}
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No events yet</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              {query || typeFilter !== "all"
                ? "No events match your filters."
                : "Create your first event to start tracking attendance."}
            </p>
            {!query && typeFilter === "all" && (
              <Button
                render={<Link href="/events/new" />}
                className="mt-6"
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Create Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <EventsTable events={filtered} />
      )}
    </div>
  );
}

