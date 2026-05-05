"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, UserMinus, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type EnrolledProfile = {
  id: string;
  profile_id: string;
  event_id: string;
  profiles: Pick<Profile, "id" | "full_name" | "email" | "student_id"> | null;
};

interface Props {
  eventId: string;
  initial: EnrolledProfile[];
  allStudents: Pick<Profile, "id" | "full_name" | "email" | "student_id">[];
}

export function EnrollmentManager({ eventId, initial, allStudents }: Props) {
  const [enrolled, setEnrolled] = useState<EnrolledProfile[]>(initial);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const enrolledProfileIds = new Set(enrolled.map((e) => e.profile_id));

  const searchResults = allStudents
    .filter((s) => !enrolledProfileIds.has(s.id))
    .filter(
      (s) =>
        !query ||
        s.full_name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase()) ||
        (s.student_id ?? "").toLowerCase().includes(query.toLowerCase())
    );

  function handleEnroll(student: Pick<Profile, "id" | "full_name" | "email" | "student_id">) {
    setEnrollingId(student.id);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: student.id }),
      });

      setEnrollingId(null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Enrollment failed", { description: err.error });
        return;
      }

      const enrollment: EnrolledProfile = await res.json();
      setEnrolled((prev) => [enrollment, ...prev]);
      toast.success(`${student.full_name} enrolled`);
    });
  }

  function handleUnenroll(profileId: string, name: string) {
    setRemovingId(profileId);
    startTransition(async () => {
      const res = await fetch(
        `/api/events/${eventId}/enrollments/${profileId}`,
        { method: "DELETE" }
      );

      setRemovingId(null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to unenroll", { description: err.error });
        return;
      }

      setEnrolled((prev) => prev.filter((e) => e.profile_id !== profileId));
      toast.success(`${name} unenrolled`);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Enrollment</CardTitle>
        <Badge variant="secondary" className="tabular-nums">
          {enrolled.length} / {allStudents.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enrolled list */}
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {enrolled.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No students enrolled yet
            </p>
          ) : (
            enrolled.map((e) => {
              const p = e.profiles;
              if (!p) return null;
              return (
                <div
                  key={e.profile_id}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
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
                    </p>
                  </div>
                  {p.student_id && (
                    <Badge variant="outline" className="shrink-0 font-mono text-xs">
                      {p.student_id}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUnenroll(e.profile_id, p.full_name)}
                    disabled={isPending && removingId === e.profile_id}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Add student */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Search students to enroll…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {searchResults.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No students found
                </p>
              ) : (
                searchResults.slice(0, 20).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-xs font-bold text-primary">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">
                        {s.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.email}
                        {s.student_id && ` · ${s.student_id}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 text-xs"
                      disabled={isPending && enrollingId === s.id}
                      onClick={() => handleEnroll(s)}
                    >
                      {isPending && enrollingId === s.id ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <>
                          <UserPlus className="mr-1 h-3 w-3" />
                          Enroll
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

