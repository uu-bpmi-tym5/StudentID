import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CreateEventForm } from "@/components/events/create-event-form";

export const metadata: Metadata = {
  title: "New Event",
};

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: tappers } = await supabase
    .from("tappers")
    .select("id, name")
    .order("id");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Event"
        description="Set up a new lecture, exam, or lab session"
      >
        <Button variant="ghost" size="sm" render={<Link href="/events" />}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Back to Events
        </Button>
      </PageHeader>

      <CreateEventForm tappers={tappers ?? []} />
    </div>
  );
}

