import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Event Detail" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Event Detail" description={"Event " + eventId.slice(0, 8)}>
        <Badge variant="outline" className="font-mono text-xs">{eventId.slice(0, 8)}</Badge>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Event details and configuration will appear here.</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden lg:col-span-2">
          <CardContent className="flex h-80 items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Live Attendance Feed</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Real-time attendance via Supabase Realtime will stream here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
