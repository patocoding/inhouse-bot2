# HTTP handler do Discord (bot)

O ponto de entrada das **Interações** (`POST` com assinatura `ed25519`) vive no app Next.js:

- `[apps/web/app/api/interactions/route.ts](../web/app/api/interactions/route.ts)` — PING, `DEFER` (tipo 5) e `waitUntil` + `PATCH` `messages/@original` via [editOriginal.ts](../web/lib/discord/editOriginal.ts)

Não é necessário um segundo processo 24/7: o registo de slash commands continua no script [packages/discord-commands/register.mjs](../../packages/discord-commands/register.mjs).