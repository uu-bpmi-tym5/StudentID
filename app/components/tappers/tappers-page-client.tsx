"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TappersTable } from "@/components/tappers/tappers-table";
import { RegisterTapperDialog } from "@/components/tappers/register-tapper-dialog";
import type { Tapper } from "@/lib/supabase/types";

type Props = {
  initial: Tapper[];
};

export function TappersPageClient({ initial }: Props) {
  const [tappers, setTappers] = useState<Tapper[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("tappers-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tappers" },
        (payload) => {
          const updated = payload.new as Tapper;
          setTappers((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleRegistered(tapper: Tapper) {
    setTappers((prev) => [...prev, tapper].sort((a, b) => a.id.localeCompare(b.id)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tappers"
        description="NFC reader devices and their connection status"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Register Tapper
        </Button>
      </PageHeader>

      <TappersTable tappers={tappers} />

      <RegisterTapperDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRegistered={handleRegistered}
      />
    </div>
  );
}
