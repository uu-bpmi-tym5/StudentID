"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreditCard, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/supabase/types";

export type PairedCard = {
  id: string;
  card_uid: string;
  label: string | null;
  is_active: boolean;
  registered_at: string;
  profiles: Pick<Profile, "id" | "full_name" | "email" | "student_id" | "role"> | null;
};

type Props = {
  initial: PairedCard[];
};

export function CardsTable({ initial }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<PairedCard[]>(initial);
  const [pendingId, startTransition] = useTransition();
  void pendingId;

  function handleDelete(id: string, cardUid: string) {
    startTransition(async () => {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove card");
        return;
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Card removed", { description: cardUid });
      router.refresh();
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!res.ok) {
        toast.error("Failed to update card");
        return;
      }
      const updated: PairedCard = await res.json();
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success(updated.is_active ? "Card activated" : "Card deactivated");
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Paired cards</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {cards.length} total
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          All NFC cards registered in the system.
        </p>
      </CardHeader>

      {cards.length === 0 ? (
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No cards paired yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Tap a card on a tapper to see it in the pending scans above
            </p>
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-t">
                <TableHead className="pl-4">Card UID</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="pl-4">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wide">
                      {card.card_uid}
                    </code>
                  </TableCell>
                  <TableCell>
                    {card.profiles ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] font-bold text-primary">
                          {card.profiles.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {card.profiles.full_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {card.profiles.student_id
                              ? card.profiles.student_id
                              : card.profiles.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-1 shrink-0 capitalize text-[10px]">
                          {card.profiles.role}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Unknown
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {card.label ? (
                      <span className="text-sm">{card.label}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={card.is_active ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {card.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(card.registered_at), "dd MMM yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={card.is_active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggle(card.id, card.is_active)}
                      >
                        {card.is_active ? (
                          <ToggleRight className="h-4 w-4 text-primary" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Remove pairing"
                        onClick={() => handleDelete(card.id, card.card_uid)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}


