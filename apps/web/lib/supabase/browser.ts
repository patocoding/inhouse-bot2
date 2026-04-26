import { createBrowserClient } from "@supabase/ssr";

const MISSING = "https://configure-env.invalid";

/**
 * `next build` prerender de client components corre este código; não falhar se
 * `NEXT_PUBLIC_*` ainda não estiverem definidos no ambiente de build.
 * Em produção, define as variáveis (ex.: Vercel).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? MISSING;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJmb3JtYXRhbnQiOiIuLi4uIn0.missing";
  if (url === MISSING) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  }
  return createBrowserClient(url, key);
}
