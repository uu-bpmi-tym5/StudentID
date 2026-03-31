import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TappersPageClient } from "@/components/tappers/tappers-page-client";
import type { Tapper } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Tappers" };

export default async function TappersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tappers")
    .select("*")
    .order("id");

  const tappers = (data ?? []) as Tapper[];

  return <TappersPageClient initial={tappers} />;
}
