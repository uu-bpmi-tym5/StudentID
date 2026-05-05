"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "./export-dialog";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Pick<
  Database["public"]["Views"]["event_attendance_summary"]["Row"],
  "event_id" | "title"
>;

interface Props {
  events: EventSummary[];
}

export function ExportButton({ events }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="mr-2 h-3.5 w-3.5" />
        Export
      </Button>
      <ExportDialog events={events} open={open} onOpenChange={setOpen} />
    </>
  );
}

