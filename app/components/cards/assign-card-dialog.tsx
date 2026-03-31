"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardUid: string;
  profiles: Pick<Profile, "id" | "full_name" | "email" | "student_id" | "role">[];
  /** Called after a successful pairing so the parent can update its state */
  onPaired: (cardUid: string) => void;
};

export function AssignCardDialog({
  open,
  onOpenChange,
  cardUid,
  profiles,
  onPaired,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  const filtered = profiles.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.student_id ?? "").toLowerCase().includes(q)
    );
  });

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  function reset() {
    setQuery("");
    setSelectedId(null);
    setLabel("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_uid: cardUid,
          profile_id: selectedId,
          label: label.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Pairing failed", {
          description: err.error ?? "Unknown error",
        });
        return;
      }

      toast.success("Card paired", {
        description: `${cardUid} → ${selected?.full_name}`,
      });
      onPaired(cardUid);
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign NFC Card</DialogTitle>
          <DialogDescription>
            Link card{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {cardUid}
            </code>{" "}
            to a student or teacher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student search */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Select person
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or ID…"
                className="pl-8 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No matches
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                      selectedId === p.id && "bg-primary/10 font-medium"
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-xs font-bold text-primary">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">
                        {p.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email}
                        {p.student_id && ` · ${p.student_id}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {p.role}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Optional label */}
          <div className="space-y-1.5">
            <Label
              htmlFor="card-label"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Label{" "}
              <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Input
              id="card-label"
              ref={labelRef}
              placeholder='e.g. "Blue card"'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Pairing…
              </span>
            ) : (
              <>
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Pair card
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

