import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
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
import { CreditCard, Clock } from "lucide-react";

type Props = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();
  return { title: data?.full_name ?? "Student Profile" };
}

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createClient();

  const [profileRes, cardsRes, logsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", studentId).single(),
    supabase
      .from("nfc_cards")
      .select("*")
      .eq("profile_id", studentId)
      .order("registered_at", { ascending: false }),
    supabase
      .from("attendance_logs")
      .select("id, scanned_at, tapper_id, card_uid")
      .eq("profile_id", studentId)
      .order("scanned_at", { ascending: false })
      .limit(20),
  ]);

  if (!profileRes.data) notFound();

  const profile = profileRes.data;
  const cards = cardsRes.data ?? [];
  const logs = logsRes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name}
        description={profile.email}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold">Profile</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 font-mono text-xl font-bold text-primary">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student ID</span>
                {profile.student_id ? (
                  <Badge variant="outline">{profile.student_id}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span>{format(new Date(profile.created_at), "dd MMM yyyy")}</span>
              </div>
            </div>

            {/* NFC Cards */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  NFC Cards
                </span>
              </div>
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No cards assigned.{" "}
                  <a href="/cards" className="underline underline-offset-2 hover:text-foreground">
                    Assign one →
                  </a>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between rounded-md border px-2.5 py-1.5"
                    >
                      <code className="font-mono text-xs tracking-wide">{card.card_uid}</code>
                      <Badge
                        variant={card.is_active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {card.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance log */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent attendance</h2>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {logs.length} scans
              </Badge>
            </div>
          </CardHeader>
          {logs.length === 0 ? (
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance records yet
              </p>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-t">
                    <TableHead className="pl-4">Date &amp; Time</TableHead>
                    <TableHead>Tapper</TableHead>
                    <TableHead>Card UID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-4 text-sm">
                        {format(new Date(log.scanned_at), "dd MMM yyyy · HH:mm")}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {log.tapper_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {log.card_uid}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
