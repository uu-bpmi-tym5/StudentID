import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Radio } from "lucide-react";

type Props = { params: Promise<{ tapperId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tapperId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tappers")
    .select("name")
    .eq("id", tapperId)
    .single();
  return { title: data?.name ?? "Tapper Detail" };
}

export default async function TapperDetailPage({ params }: Props) {
  const { tapperId } = await params;
  const supabase = await createClient();

  const [tapperRes, scansRes] = await Promise.all([
    supabase.from("tappers").select("*").eq("id", tapperId).single(),
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, card_uid, profile_id, profiles(full_name, student_id)")
      .eq("tapper_id", tapperId)
      .order("scanned_at", { ascending: false })
      .limit(20),
  ]);

  if (!tapperRes.data) notFound();

  const tapper = tapperRes.data;
  const scans = scansRes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tapper.name}
        description={tapper.id}
      >
        <StatusIndicator
          variant={tapper.is_online ? "online" : "offline"}
          label={tapper.is_online ? "Online" : "Offline"}
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Device info</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{tapper.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{tapper.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span>{tapper.location ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusIndicator
                variant={tapper.is_online ? "online" : "offline"}
                label={tapper.is_online ? "Online" : "Offline"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last seen</span>
              <span>
                {tapper.last_seen_at
                  ? formatDistanceToNow(new Date(tapper.last_seen_at), { addSuffix: true })
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent scans */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Recent scans</h2>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {scans.length} scans
              </Badge>
            </div>
          </CardHeader>
          {scans.length === 0 ? (
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scans recorded yet
              </p>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-t">
                    <TableHead className="pl-4">Time</TableHead>
                    <TableHead>Card UID</TableHead>
                    <TableHead>Person</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => {
                    const profile = scan.profiles as { full_name: string; student_id: string | null } | null;
                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="pl-4 text-xs text-muted-foreground">
                          {format(new Date(scan.scanned_at), "dd MMM · HH:mm")}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {scan.card_uid}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">
                          {profile ? (
                            <span>{profile.full_name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unknown card</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
