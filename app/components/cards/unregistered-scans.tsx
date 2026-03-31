"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Wifi, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignCardDialog } from "@/components/cards/assign-card-dialog";
import type { Profile } from "@/lib/supabase/types";

type Scan = {
  id: string;
  card_uid: string;
  tapper_id: string;
  scanned_at: string;
};

type Props = {
  initial: Scan[];
  profiles: Pick<Profile, "id" | "full_name" | "email" | "student_id" | "role">[];
  pairedCardUids: string[];
};

export function UnregisteredScans({ initial, profiles, pairedCardUids }: Props) {
  const [scans, setScans] = useState<Scan[]>(initial);
  const [dialogCardUid, setDialogCardUid] = useState<string | null>(null);
  const pairedSet = useRef(new Set(pairedCardUids));

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("unregistered-scans")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_logs" },
        (payload) => {
          const row = payload.new as Scan & { profile_id: string | null };
          if (row.profile_id !== null) return; // resolved at scan time — ignore
          if (pairedSet.current.has(row.card_uid)) return; // already paired — ignore
          setScans((prev) => {
            if (prev.some((s) => s.id === row.id)) return prev;
            return [row, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handlePaired(cardUid: string) {
    pairedSet.current.add(cardUid);
    setScans((prev) => prev.filter((s) => s.card_uid !== cardUid));
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Pending scans</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">
              Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Unregistered cards scanned in the last 24 hours will appear here.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Radio className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No unregistered scans yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Tap an unpaired card on any tapper to see it here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Pending scans</h2>
            <Badge className="ml-auto bg-amber-500/15 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400 text-[10px]">
              {scans.length} unregistered
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            These cards have been tapped but are not yet linked to any profile.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                  <Radio className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-wide">
                    {scan.card_uid}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    via{" "}
                    <span className="font-medium text-foreground">
                      {scan.tapper_id}
                    </span>{" "}
                    ·{" "}
                    {formatDistanceToNow(new Date(scan.scanned_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogCardUid(scan.card_uid)}
                >
                  Assign →
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AssignCardDialog
        open={dialogCardUid !== null}
        onOpenChange={(open) => { if (!open) setDialogCardUid(null); }}
        cardUid={dialogCardUid ?? ""}
        profiles={profiles}
        onPaired={handlePaired}
      />
    </>
  );
}

