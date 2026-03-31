"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Radio } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/shared/status-indicator";
import type { Tapper } from "@/lib/supabase/types";

type Props = {
  tappers: Tapper[];
};

export function TappersTable({ tappers }: Props) {
  if (tappers.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-14">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Radio className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No tappers registered</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Register a tapper device using the button above
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Registered tappers</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {tappers.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-t">
              <TableHead className="pl-4">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tappers.map((tapper) => (
              <TableRow key={tapper.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="pl-4">
                  <Link href={`/tappers/${tapper.id}`}>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wide">
                      {tapper.id}
                    </code>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/tappers/${tapper.id}`} className="font-medium text-sm">
                    {tapper.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/tappers/${tapper.id}`} className="text-sm text-muted-foreground">
                    {tapper.location ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/tappers/${tapper.id}`}>
                    <StatusIndicator
                      variant={tapper.is_online ? "online" : "offline"}
                      label={tapper.is_online ? "Online" : "Offline"}
                    />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/tappers/${tapper.id}`} className="text-xs text-muted-foreground">
                    {tapper.last_seen_at
                      ? formatDistanceToNow(new Date(tapper.last_seen_at), { addSuffix: true })
                      : "Never"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
