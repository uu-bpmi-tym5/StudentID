"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Pick<
  Database["public"]["Views"]["event_attendance_summary"]["Row"],
  "event_id" | "title"
>;

interface Props {
  events: EventSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ events, open, onOpenChange }: Props) {
  const [eventId, setEventId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleDownload() {
    const params = new URLSearchParams();
    if (eventId) params.set("event_id", eventId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const url = `/api/export${params.toString() ? "?" + params.toString() : ""}`;
    window.open(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Attendance</DialogTitle>
          <DialogDescription>
            Download attendance logs as a CSV file. All filters are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Event
            </Label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.event_id} value={e.event_id ?? ""}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                From
              </Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                To
              </Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

