"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteEventDialog } from "./delete-event-dialog";

interface Props {
  eventId: string;
  eventTitle: string;
}

export function DeleteEventDetailsActions({ eventId, eventTitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
        className="flex-1"
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
      <DeleteEventDialog
        eventId={eventId}
        eventTitle={eventTitle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

