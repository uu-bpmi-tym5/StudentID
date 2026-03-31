import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StudentsPageClient } from "@/components/students/students-page-client";
import type { StudentRow } from "@/components/students/students-table";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, student_id, created_at, nfc_cards(id, is_active)")
    .eq("role", "student")
    .order("full_name");

  const students = (data ?? []) as StudentRow[];

  return <StudentsPageClient initial={students} />;
}
