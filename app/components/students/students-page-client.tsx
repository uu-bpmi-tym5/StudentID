"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentsTable } from "@/components/students/students-table";
import { AddStudentDialog } from "@/components/students/add-student-dialog";
import type { StudentRow } from "@/components/students/students-table";

type Props = {
  initial: StudentRow[];
};

export function StudentsPageClient({ initial }: Props) {
  const [students, setStudents] = useState<StudentRow[]>(initial);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = students.filter((s) => {
    const q = query.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.student_id ?? "").toLowerCase().includes(q)
    );
  });

  function handleCreated(student: StudentRow) {
    setStudents((prev) => [student, ...prev]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student accounts and NFC card assignments"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Student
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or ID…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <StudentsTable students={filtered} />

      <AddStudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
