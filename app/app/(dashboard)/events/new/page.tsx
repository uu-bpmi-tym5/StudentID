import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New Event",
};

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Event"
        description="Set up a new lecture, exam, or lab session"
      />

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Event creation form will be implemented here.
            <br />
            Fields: title, type, date/time range, tapper assignment, student
            enrollment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

