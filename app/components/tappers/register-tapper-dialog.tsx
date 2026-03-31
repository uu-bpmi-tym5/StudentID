"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Radio } from "lucide-react";
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
import type { Tapper } from "@/lib/supabase/types";

const schema = z.object({
  id:       z.string().min(1, "ID is required").regex(/^[a-z0-9:.-]+$/, "Use lowercase letters, digits, hyphens, dots, or colons only"),
  name:     z.string().min(1, "Name is required"),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (tapper: Tapper) => void;
};

export function RegisterTapperDialog({ open, onOpenChange, onRegistered }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const res = await fetch("/api/tappers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(
          res.status === 409 ? "Tapper ID already exists" : "Failed to register tapper",
          { description: res.status !== 409 ? (err.error ?? "Unknown error") : undefined }
        );
        return;
      }

      const tapper: Tapper = await res.json();
      toast.success("Tapper registered", { description: tapper.id });
      onRegistered(tapper);
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register Tapper</DialogTitle>
          <DialogDescription>
            Add a new NFC reader device to the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tapper-id" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Device ID
            </Label>
            <Input id="tapper-id" placeholder="e.g. tapper-001 or 2c:cf:67:c4:77:a2" {...register("id")} />
            <p className="text-xs text-muted-foreground">
              Must match the MQTT topic namespace the device uses.
            </p>
            {errors.id && (
              <p className="text-xs text-destructive">{errors.id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tapper-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input id="tapper-name" placeholder="e.g. Main Entrance Reader" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tapper-location" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Location <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Input id="tapper-location" placeholder="e.g. Room 101, Building A" {...register("location")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Registering…
                </span>
              ) : (
                <>
                  <Radio className="mr-1.5 h-3.5 w-3.5" />
                  Register tapper
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
