"use client";

import Link from "next/link";
import { format } from "date-fns";
import { GraduationCap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile, NfcCard } from "@/lib/supabase/types";

export type StudentRow = Pick<Profile, "id" | "full_name" | "email" | "student_id" | "created_at"> & {
  nfc_cards: Array<Pick<NfcCard, "id" | "is_active">>;
};

type Props = {
  students: StudentRow[];
};

export function StudentsTable({ students }: Props) {
  if (students.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-14">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No students yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Add a student using the button above
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">All students</h2>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {students.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-t">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>NFC Card</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="pl-4">
                  <Link href={`/students/${student.id}`} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-xs font-bold text-primary">
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{student.full_name}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`} className="text-sm text-muted-foreground">
                    {student.email}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`}>
                    {student.student_id ? (
                      <span className="text-sm">{student.student_id}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`}>
                    {student.nfc_cards.length > 0 ? (
                      <Badge variant="default" className="text-[10px]">Has card</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">No card</Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`} className="text-xs text-muted-foreground">
                    {format(new Date(student.created_at), "dd MMM yyyy")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
