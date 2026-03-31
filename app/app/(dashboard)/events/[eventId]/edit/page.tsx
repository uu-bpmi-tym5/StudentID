import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit Event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Edit Event" description="Update event configuration" />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Event edit form for {eventId.slice(0, 8)} will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
