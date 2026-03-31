import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusIndicator } from "@/components/shared/status-indicator";

export const metadata: Metadata = { title: "Tapper Detail" };

export default async function TapperDetailPage({
  params,
}: {
  params: Promise<{ tapperId: string }>;
}) {
  const { tapperId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Tapper Detail" description={"Device: " + tapperId}>
        <StatusIndicator variant="offline" label="Offline" />
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Device info, location, and configuration.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Assigned events and recent scans.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
