import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current request is from an authenticated admin.
 * Returns the user object or null.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

/**
 * Verifies the current request is from an authenticated admin or teacher.
 * Returns the user + role or null.
 */
export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return profile.role === "admin" || profile.role === "teacher"
    ? { user, role: profile.role }
    : null;
}

