import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type UserRole = "tutor" | "student";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware/proxy refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Server-side authorization helper using getClaims() for JWT verification
 * and the authoritative profiles table for role resolution.
 * Do NOT use getSession() for authorization decisions.
 */
export async function getAuthRole(): Promise<{
  userId: string;
  role: UserRole | null;
} | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Use getClaims() as the primary mechanism for verifying the authenticated JWT
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return null;
  }

  const userId = claimsData.claims.sub as string;
  if (!userId) return null;

  // Query authoritative server-side profiles table for role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role =
    profile?.role === "tutor" || profile?.role === "student"
      ? profile.role
      : null;

  return {
    userId,
    role,
  };
}
