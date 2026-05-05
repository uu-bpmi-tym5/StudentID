"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

interface ScanRecord {
  scanned_at: string;
}

interface Props {
  data: ScanRecord[];
}

export function AttendanceTrendChart({ data }: Props) {
  const counts: Record<string, number> = {};
  for (const row of data) {
    const day = format(parseISO(row.scanned_at), "yyyy-MM-dd");
    counts[day] = (counts[day] ?? 0) + 1;
  }

  const chartData = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      label: format(parseISO(date), "dd MMM"),
      count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        No scan data in the last 30 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
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
          formatter={(value, _name, entry) => [
            `${value ?? 0} scans on ${(entry.payload as { label: string }).label}`,
            "",
          ]}
          labelFormatter={() => ""}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}





