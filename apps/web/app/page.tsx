import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Inhouse LoL</h1>
      <p className="text-slate-300">
        Regista com e-mail (Supabase), gera um código e usa <code className="bg-slate-800 px-1">/vincular</code> no
        Discord. Depois, fila, sorteio e MMR a partir do bot.
      </p>
      <ul className="list-disc pl-5 space-y-1 text-slate-300">
        <li>
          <Link className="text-blue-400 hover:underline" href="/login">
            Entrar / Registo
          </Link>
        </li>
        <li>
          <Link className="text-blue-400 hover:underline" href="/vincular">
            Gerar código de vínculo
          </Link>
        </li>
        <li>
          <Link className="text-blue-400 hover:underline" href="/ranking">
            Ranking (contas vinculadas)
          </Link>
        </li>
      </ul>
    </main>
  );
}
