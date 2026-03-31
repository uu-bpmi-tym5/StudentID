import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, Upload } from "lucide-react";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Students" description="Student directory and management">
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-3.5 w-3.5" />
          Import CSV
        </Button>
      </PageHeader>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" />
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No students yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Students will appear here once profiles are created or imported.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
