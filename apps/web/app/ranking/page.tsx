import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    redirect("/login");
  }
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("display_name, mmr, wins, losses, discord_user_id")
    .order("mmr", { ascending: false })
    .limit(30);
  if (error) {
    return <p className="p-8 text-red-400">Erro: {error.message}</p>;
  }
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Ranking (MMR)</h1>
      <ul className="space-y-1 text-slate-200">
        {(rows ?? []).map((p, i) => {
          const w = p.wins ?? 0;
          const l = p.losses ?? 0;
          return (
            <li key={i} className="flex justify-between border-b border-slate-800 py-1">
              <span>
                {i + 1}. {p.display_name ?? p.discord_user_id ?? "—"}
              </span>
              <span>
                {Math.round((p as { mmr: number }).mmr * 10) / 10} · {w}V/{l}D
              </span>
            </li>
          );
        })}
      </ul>
      <Link className="text-blue-400 text-sm" href="/">
        Início
      </Link>
    </main>
  );
}
