import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  CalendarDays,
  GraduationCap,
  Radio,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

const stats = [
  {
    label: "Active Events",
    value: "—",
    icon: CalendarDays,
    trend: null,
  },
  {
    label: "Students",
    value: "—",
    icon: GraduationCap,
    trend: null,
  },
  {
    label: "Tappers Online",
    value: "—",
    icon: Radio,
    trend: null,
  },
  {
    label: "Avg. Attendance",
    value: "—",
    icon: TrendingUp,
    trend: null,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="System overview and real-time activity"
      />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </CardContent>
            {/* Decorative bottom accent line */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
          </Card>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Recent Activity
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Connect Supabase to see live scan events
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-64 items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Attendance Trends
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Charts will appear once events are created
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

