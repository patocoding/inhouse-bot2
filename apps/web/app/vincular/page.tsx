"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  let s = "";
  for (const x of a) {
    s += CHARSET[x! % CHARSET.length]!;
  }
  return s;
}

export default function VincularPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [exp, setExp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase.auth]);

  const gen = async () => {
    setErr(null);
    setLoading(true);
    const c = makeCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) {
      setErr("Faz login primeiro.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("link_codes").insert({
      user_id: s.user.id,
      code: c,
      expires_at: expires.toISOString(),
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setCode(c);
    setExp(expires.toLocaleString("pt-PT"));
  };

  if (!userId) {
    return (
      <main className="mx-auto max-w-md p-8">
        <p className="mb-2">É preciso sessão. </p>
        <Link className="text-blue-400" href="/login">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-xl font-semibold">Código para o Discord</h1>
      <p className="text-slate-400 text-sm">
        No servidor, usa: <code className="bg-slate-800 px-1">/vincular codigo:TEU_CODIGO</code>
      </p>
      <button
        type="button"
        onClick={gen}
        disabled={loading}
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "A gerar…" : "Gerar novo código (15 min)"}
      </button>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {code && (
        <div className="rounded border border-slate-700 p-4 font-mono text-lg">
          {code}
          {exp && <p className="text-slate-500 text-sm mt-2">Válido até: {exp}</p>}
        </div>
      )}
      <Link href="/" className="text-blue-400 text-sm block">
        Início
      </Link>
    </main>
  );
}
