import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Plus, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
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

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
            <CalendarDays className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No events yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create your first event to start tracking attendance with NFC
            tappers.
          </p>
          <Button render={<Link href="/events/new" />} className="mt-6" variant="outline" size="sm">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create Event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

