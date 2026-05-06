"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Database["public"]["Views"]["event_attendance_summary"]["Row"];

const chartConfig = {
  pct: { label: "Attendance", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

interface Props {
  data: EventSummary[];
}

export function AttendanceRateChart({ data }: Props) {
  const chartData = data
    .slice(0, 10)
    .reverse()
    .map((row) => {
      const t = row.title ?? "Untitled";
      return {
        name: t,
        short: t.length > 13 ? t.slice(0, 13) + "…" : t,
        pct: row.attendance_pct ?? 0,
        attended: row.attended_count ?? 0,
        enrolled: row.enrolled_count ?? 0,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
        No events with attendance data yet
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="short"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as {
              name: string;
              pct: number;
              attended: number;
              enrolled: number;
            };
            return (
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                <p className="mb-1.5 max-w-[180px] font-medium text-foreground">{d.name}</p>
                <p className="text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {d.pct.toFixed(1)}%
                  </span>{" "}
                  attendance rate
                </p>
                <p className="text-muted-foreground">
                  {d.attended} / {d.enrolled} enrolled attended
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="pct" fill="var(--color-pct)" radius={[4, 4, 0, 0]} maxBarSize={56}>
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v: unknown) => (typeof v === "number" && v > 0 ? `${v.toFixed(0)}%` : "")}
            style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}


