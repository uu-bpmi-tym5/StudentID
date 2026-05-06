"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";

type LogEntry = {
  id: string;
  scanned_at: string;
  tapper_id: string;
  card_uid: string;
  profile_id: string | null;
  profiles?: { full_name: string } | null;
};

interface Props {
  initial: LogEntry[];
}

export function RecentActivityFeed({ initial }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(initial);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("dashboard-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        async (payload) => {
          const log = payload.new as LogEntry;
          if (log.profile_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", log.profile_id)
              .single();
            log.profiles = profile ?? null;
          }
          setLogs((prev) => [log, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!logs.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground px-6">
        No scans recorded yet
      </div>
    );
  }

  return (
    <div className="divide-y">
      {logs.map((log) => {
        const name = log.profiles?.full_name;
        return (
          <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-xs font-bold text-primary">
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {name ?? (
                  <span className="italic text-muted-foreground">
                    Unknown card
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                via <code className="font-mono">{log.tapper_id}</code>
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.scanned_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
