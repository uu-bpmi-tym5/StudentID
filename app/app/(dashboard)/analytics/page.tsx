import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Attendance trends, charts, and exports">
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-3.5 w-3.5" />
          Export
        </Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Attendance rate chart</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Trend over time chart</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
