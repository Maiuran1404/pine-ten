import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

// Singleton admin client for storage operations (no cookie handling needed)
let _adminStorageClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Get the admin storage client for file operations.
 * Uses the service role key for full access to storage buckets.
 * This is a singleton to avoid creating multiple clients.
 */
export function getAdminStorageClient() {
  if (!_adminStorageClient) {
    _adminStorageClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminStorageClient;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Server Component - cookies can't be set, this is expected
            logger.debug({ err: error }, "Could not set cookies in Server Component context");
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Server Component - cookies can't be set, this is expected
            logger.debug({ err: error }, "Could not set cookies in Server Component context (admin client)");
          }
        },
      },
    }
  );
}
