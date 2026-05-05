"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Database } from "@/lib/supabase/types";

type EventSummary = Database["public"]["Views"]["event_attendance_summary"]["Row"];

interface Props {
  data: EventSummary[];
}

export function AttendanceRateChart({ data }: Props) {
  const chartData = data
    .slice(0, 20)
    .map((row) => ({
      title:
        (row.title ?? "Untitled").length > 24
          ? (row.title ?? "Untitled").slice(0, 24) + "…"
          : (row.title ?? "Untitled"),
      pct: row.attendance_pct ?? 0,
      attended: row.attended_count ?? 0,
      enrolled: row.enrolled_count ?? 0,
    }))
    .reverse();

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        No events with attendance data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 36)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="title"
          width={160}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
          }}
          formatter={(value, _name, entry) => {
            const pct = typeof value === "number" ? value.toFixed(1) : value;
            const { attended, enrolled } = entry.payload as { attended: number; enrolled: number };
            return [`${pct}% (${attended}/${enrolled} enrolled)`, "Attendance"];
          }}
        />
        <Bar
          dataKey="pct"
          fill="hsl(var(--chart-3))"
          radius={[0, 3, 3, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}


