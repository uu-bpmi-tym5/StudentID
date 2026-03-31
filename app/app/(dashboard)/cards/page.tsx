import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { UnregisteredScans } from "@/components/cards/unregistered-scans";
import { CardsTable } from "@/components/cards/cards-table";
import type { PairedCard } from "@/components/cards/cards-table";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "NFC Cards" };

export default async function CardsPage() {
  const supabase = await createClient();

  // Paired cards with profile info
  const { data: cardsRaw } = await supabase
    .from("nfc_cards")
    .select("*, profiles(id, full_name, email, student_id, role)")
    .order("registered_at", { ascending: false });

  // Recent unregistered scans (last 24 h, no profile linked)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingRaw } = await supabase
    .from("attendance_logs")
    .select("id, card_uid, tapper_id, scanned_at")
    .is("profile_id", null)
    .gte("scanned_at", since)
    .order("scanned_at", { ascending: false })
    .limit(20);

  // All profiles available for assignment (exclude admins)
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, student_id, role")
    .in("role", ["student", "teacher"])
    .order("full_name");

  // Already-paired profile IDs so we can mark them
  const pairedProfileIds = new Set(
    (cardsRaw ?? []).map((c) => (c.profiles as { id: string } | null)?.id)
  );

  const cards = (cardsRaw ?? []) as PairedCard[];
  const pending = pendingRaw ?? [];
  const profiles = (profilesRaw ?? []) as Pick<
    Profile,
    "id" | "full_name" | "email" | "student_id" | "role"
  >[];

  // Remove profiles that already have a card assigned
  const assignableProfiles = profiles.filter(
    (p) => !pairedProfileIds.has(p.id)
  );

  // Deduplicate pending scans by card_uid (keep latest per UID)
  const seenUids = new Set<string>();
  const uniquePending = pending.filter((s) => {
    if (seenUids.has(s.card_uid)) return false;
    seenUids.add(s.card_uid);
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="NFC Cards"
        description="Pair physical NFC cards to student and teacher profiles"
      />

      <UnregisteredScans
        initial={uniquePending}
        profiles={assignableProfiles}
      />

      <CardsTable initial={cards} />
    </div>
  );
}


