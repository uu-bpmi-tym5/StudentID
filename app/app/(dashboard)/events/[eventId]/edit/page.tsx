import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EditEventForm } from "@/components/events/edit-event-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();
  return { title: data ? `Edit · ${data.title}` : "Edit Event" };
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const [{ data: event, error }, { data: tappers }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("tappers").select("id, name").order("id"),
  ]);

  if (error || !event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Event" description="Update event configuration">
        <Button variant="ghost" size="sm" render={<Link href={`/events/${eventId}`} />}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Back to Event
        </Button>
      </PageHeader>
      <EditEventForm event={event} tappers={tappers ?? []} />
    </div>
  );
}
