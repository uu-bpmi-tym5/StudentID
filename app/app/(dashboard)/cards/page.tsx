import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = { title: "NFC Cards" };

export default function CardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="NFC Cards" description="Card registry — pair and manage NFC cards" />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No cards registered</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Use the scan-to-assign flow to pair NFC cards with student profiles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
