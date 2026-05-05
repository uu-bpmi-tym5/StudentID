"use client";

import Link from "next/link";
import { format } from "date-fns";
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

interface Props {
  events: EventSummary[];
}

export function EventsTable({ events }: Props) {
  const now = new Date();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Tapper</TableHead>
            <TableHead>Date range</TableHead>
            <TableHead className="text-right">Enrolled</TableHead>
            <TableHead className="text-right">Attendance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const isActive =
              event.ends_at ? new Date(event.ends_at) > now : false;
            const startsAt = event.starts_at
              ? format(new Date(event.starts_at), "dd MMM yyyy · HH:mm")
              : "—";
            const endsAt = event.ends_at
              ? format(new Date(event.ends_at), "HH:mm")
              : "—";

            return (
              <TableRow key={event.event_id}>
                <TableCell>
                  <Link
                    href={`/events/${event.event_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {event.type && (
                    <Badge
                      variant={TYPE_VARIANTS[event.type]}
                      className="capitalize"
                    >
                      {event.type}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {event.tapper_id}
                  </code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {startsAt} → {endsAt}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {event.enrolled_count ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {event.attendance_pct != null
                    ? `${event.attendance_pct.toFixed(1)}%`
                    : "—"}
                </TableCell>
                <TableCell>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Past</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

