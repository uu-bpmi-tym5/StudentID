import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  // Read env vars server-side — never sent to browser in full
  const webhookSecret = process.env.SCAN_WEBHOOK_SECRET;
  const maskedSecret = webhookSecret
    ? "••••••••" + webhookSecret.slice(-4)
    : "Not configured";
  const appUrl = process.env.APP_URL ?? "Not configured";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration (admin only)"
      />

      {/* Attendance Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Attendance Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Attendance rules define when a scan counts as present, late, or
            absent. The late threshold is the number of minutes after an event
            starts before a scan is marked late. The grace period is the window
            after an event ends during which scans are still accepted.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Late threshold
              </p>
              <p className="mt-1 font-mono text-lg font-bold">—</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Configurable in a future release
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grace period
              </p>
              <p className="mt-1 font-mono text-lg font-bold">—</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Configurable in a future release
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <span className="text-muted-foreground">Webhook secret</span>
            <code className="font-mono text-xs">{maskedSecret}</code>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <span className="text-muted-foreground">App URL</span>
            <code className="font-mono text-xs">{appUrl}</code>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <span className="text-muted-foreground">MQTT port</span>
            <code className="font-mono text-xs">1883</code>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <span className="text-muted-foreground">Broker listener</span>
            <code className="font-mono text-xs">0.0.0.0:1883</code>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Retrieve the full webhook secret from your server&apos;s{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code> file.
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tamper alerts</p>
              <p className="text-xs text-muted-foreground">
                Email notification when a tapper reports a tamper event
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              Not configured
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Offline detection</p>
              <p className="text-xs text-muted-foreground">
                Planned cron/TTL implementation — not yet available
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              Not configured
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
