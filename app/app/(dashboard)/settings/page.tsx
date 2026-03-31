import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration (admin only)" />
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="text-sm font-semibold">Attendance Rules</h3>
            <p className="text-sm text-muted-foreground">Late threshold, grace period, and academic terms.</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold">Webhook Configuration</h3>
            <p className="text-sm text-muted-foreground">MQTT bridge secret and broker connection settings.</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">Email alerts for tamper events and device offline.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
