import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "My Attendance" };

export default function MyAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Your attendance record across all events" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Rate</span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">&mdash;%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events Attended</span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">&mdash;</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Streak</span>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">&mdash;</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="flex h-64 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Your attendance history will appear here once events are recorded.</p>
        </CardContent>
      </Card>
    </div>
  );
}
