"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AttendanceLog } from "@/lib/supabase/types";

type LogWithProfile = AttendanceLog & {
  profiles?: { full_name: string; student_id: string | null } | null;
};

interface Props {
  eventId: string;
  initial: LogWithProfile[];
}

export function EventAttendanceFeed({ eventId, initial }: Props) {
  const [logs, setLogs] = useState<LogWithProfile[]>(initial);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance_feed_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_logs",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newLog = payload.new as LogWithProfile;
          setLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function dotColor(log: LogWithProfile) {
    if (log.profile_id && log.event_id) return "bg-green-500";
    if (log.profile_id && !log.event_id) return "bg-yellow-500";
    return "bg-red-500";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Live Feed</CardTitle>
        <Badge variant="secondary" className="tabular-nums">
          {logs.length} scans
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-72 overflow-y-auto px-4 pb-4">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No scans yet — waiting for NFC taps…
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor(log)}`}
                  />
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {format(new Date(log.scanned_at), "HH:mm:ss")}
                  </span>
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {log.card_uid}
                  </code>
                  <span className={log.profiles ? "font-medium" : "italic text-muted-foreground"}>
                    {log.profiles?.full_name ?? "Unknown card"}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

