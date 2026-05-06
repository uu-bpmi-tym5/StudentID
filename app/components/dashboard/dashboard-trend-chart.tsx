"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

interface ScanRecord {
  scanned_at: string;
}

interface Props {
  data: ScanRecord[];
}

const chartConfig = {
  count: { label: "Scans", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function DashboardTrendChart({ data }: Props) {
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
      <div className="flex h-[192px] items-center justify-center text-xs text-muted-foreground">
        No scan data in the last 7 days
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[192px] w-full">
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { label: string; count: number };
            return (
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                <p className="mb-1 font-medium text-foreground">{d.label}</p>
                <p className="text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">{d.count}</span>{" "}
                  {d.count === 1 ? "scan" : "scans"}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  );
}


