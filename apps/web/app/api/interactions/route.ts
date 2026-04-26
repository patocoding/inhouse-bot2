import { NextResponse } from "next/server";
import { waitUntil as vercelWaitUntil } from "@vercel/functions";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import { getServerEnv } from "@/lib/env";
import { makeDeferPayload, processApplicationCommand, type DInteraction } from "@/lib/bot/handler";
import { editOriginal } from "@/lib/discord/editOriginal";

export const runtime = "nodejs";
export const maxDuration = 60;

const PING = 1;
const APP_CMD = 2;

function runAfterResponse(p: Promise<unknown>) {
  if (process.env.VERCEL) {
    vercelWaitUntil(p);
  } else {
    void p.catch((e) => console.error("background interaction error", e));
  }
}

type RawInteraction = {
  type: number;
  application_id: string;
  token: string;
  data?: { name?: string; options?: unknown[] };
  member?: { user?: { id: string }; roles?: string[] };
  user?: { id: string };
  guild_id?: string | null;
  channel_id?: string;
};

export async function POST(request: Request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const sig = request.headers.get("X-Signature-Ed25519");
  const ts = request.headers.get("X-Signature-Timestamp");

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return new NextResponse("Config em falta no servidor (env).", { status: 500 });
  }
  if (!verifyDiscordRequest(env.DISCORD_PUBLIC_KEY, sig, ts, buf)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: RawInteraction;
  try {
    body = JSON.parse(buf.toString("utf8")) as RawInteraction;
  } catch {
    return new NextResponse("Bad body", { status: 400 });
  }

  if (body.type === PING) {
    return NextResponse.json({ type: 1 });
  }

  if (body.type === APP_CMD) {
    const it = body as DInteraction;
    const defer = makeDeferPayload();
    runAfterResponse(
      (async () => {
        try {
          const res = await processApplicationCommand(it);
          await editOriginal(
            { application_id: body.application_id, token: body.token },
            { content: res.content.slice(0, 2000) }
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          try {
            await editOriginal(
              { application_id: body.application_id, token: body.token },
              { content: `Erro interno: ${msg.slice(0, 500)}` }
            );
          } catch {
            // ignora
          }
        }
      })()
    );
    return NextResponse.json(defer);
  }

  return NextResponse.json({ type: 4, data: { content: "Tipo de interação não suportado." } });
}
