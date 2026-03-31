import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Student Profile" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Student Profile" description={"ID: " + studentId.slice(0, 8)} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Student profile and card info will appear here.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Attendance history will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
