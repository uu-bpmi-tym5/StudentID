import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Tappers" };

export default function TappersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tappers" description="NFC reader devices and their status">
        <Button size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Register Tapper
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
            <Radio className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No tappers registered</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Tapper devices will appear here once they connect via MQTT.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
