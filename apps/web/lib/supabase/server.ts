import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const MISSING = "https://configure-env.invalid";
const MISSING_KEY = "eyJmb3JtYXRhbnQiOiIuLi4uIn0.missing";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? MISSING;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? MISSING_KEY;
  if (url === MISSING && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no servidor");
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[]
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component — ignorar; middleware atualiza
        }
      },
    },
  });
}
