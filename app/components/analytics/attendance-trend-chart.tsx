"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
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
  count: { label: "Scans", color: "oklch(0.72 0.20 250)" },
} satisfies ChartConfig;

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
      <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
        No scan data in the last 30 days
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
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
          width={30}
        />
        <ChartTooltip
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
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
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          fill="url(#trendGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}





