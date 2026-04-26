"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Revisa o e-mail: magic link para concluir o login.");
  };

  return (
    <main className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <p className="text-slate-400 text-sm">Recebes um link por e-mail (Supabase Auth).</p>
      <form onSubmit={send} className="space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
          placeholder="email@exemplo.com"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "A enviar…" : "Enviar link"}
        </button>
      </form>
      {msg && <p className="text-slate-300 text-sm">{msg}</p>}
      <Link href="/" className="text-blue-400 text-sm block">
        Início
      </Link>
    </main>
  );
}
