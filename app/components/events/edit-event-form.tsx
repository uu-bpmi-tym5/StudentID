"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Event, Tapper } from "@/lib/supabase/types";

const editEventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(["exam", "lecture", "lab", "other"]),
    tapper_id: z.string().min(1, "Please select a tapper"),
    starts_at: z.string().min(1, "Start time is required"),
    ends_at: z.string().min(1, "End time is required"),
    description: z.string().optional(),
    allow_self_enrollment: z.boolean(),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: "End time must be after start time",
    path: ["ends_at"],
  });

type FormValues = z.infer<typeof editEventSchema>;

interface Props {
  event: Event;
  tappers: Pick<Tapper, "id" | "name">[];
}

/** Convert an ISO datetime string to datetime-local input value */
function toDatetimeLocal(iso: string) {
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return iso;
  }
}

export function EditEventForm({ event, tappers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: event.title,
      type: event.type,
      tapper_id: event.tapper_id,
      starts_at: toDatetimeLocal(event.starts_at),
      ends_at: toDatetimeLocal(event.ends_at),
      description: event.description ?? "",
      allow_self_enrollment: event.allow_self_enrollment ?? false,
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          starts_at: new Date(data.starts_at).toISOString(),
          ends_at: new Date(data.ends_at).toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to update event", {
          description: err.error ?? "Unknown error",
        });
        return;
      }

      toast.success("Event updated");
      router.push(`/events/${event.id}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Title
            </Label>
            <Input {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </Label>
            <select
              {...register("type")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="exam">Exam</option>
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Tapper */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tapper
            </Label>
            <select
              {...register("tapper_id")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {tappers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
            {errors.tapper_id && (
              <p className="text-xs text-destructive">{errors.tapper_id.message}</p>
            )}
          </div>

          {/* Date range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Starts at
              </Label>
              <Input type="datetime-local" {...register("starts_at")} />
              {errors.starts_at && (
                <p className="text-xs text-destructive">{errors.starts_at.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ends at
              </Label>
              <Input type="datetime-local" {...register("ends_at")} />
              {errors.ends_at && (
                <p className="text-xs text-destructive">{errors.ends_at.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description{" "}
              <span className="normal-case font-normal">(optional)</span>
            </Label>
            <textarea
              {...register("description")}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Self-enrollment toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-4 hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={watch("allow_self_enrollment") ?? false}
              onChange={(e) => setValue("allow_self_enrollment", e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium leading-tight">
                Allow self-enrollment
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Students can enroll and unenroll themselves from this event via their Events page.
                When disabled, only staff can manage enrollment.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/events/${event.id}`)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

