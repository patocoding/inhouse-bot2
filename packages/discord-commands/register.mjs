/**
 * Regista slash commands (global). Requer: DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID
 * Uso: node packages/discord-commands/register.mjs
 * Opcional: GUILD_ID — regista só nesse servidor (mais rápido para testes)
 */

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !appId) {
  console.error("Defina DISCORD_BOT_TOKEN e DISCORD_APPLICATION_ID");
  process.exit(1);
}

const base = "https://discord.com/api/v10";
const path = guildId
  ? `${base}/applications/${appId}/guilds/${guildId}/commands`
  : `${base}/applications/${appId}/commands`;

const body = [
  {
    name: "vincular",
    description: "Vincular a tua conta do site (e-mail) a este Discord",
    type: 1,
    dm_permission: false,
    options: [
      {
        type: 3,
        name: "codigo",
        description: "Código gerado no site (página vincular)",
        required: true,
      },
    ],
  },
  { name: "perfil", description: "Ver MMR, vitórias e derrotas", type: 1, dm_permission: false },
  { name: "entrar", description: "Entrar na fila inhouse (máx. 10)", type: 1, dm_permission: false },
  { name: "sair", description: "Sair da fila", type: 1, dm_permission: false },
  { name: "fila", description: "Ver a fila atual", type: 1, dm_permission: false },
  { name: "sortear", description: "Sortear 5v5 balanceado (Staff)", type: 1, dm_permission: false },
  {
    name: "resultado",
    description: "Registar vencedor da última partida pendente (Staff)",
    type: 1,
    dm_permission: false,
    options: [
      {
        type: 3,
        name: "vencedor",
        description: "Time vencedor",
        required: true,
        choices: [
          { name: "A", value: "A" },
          { name: "B", value: "B" },
        ],
      },
    ],
  },
  { name: "ranking", description: "Top 20 MMR", type: 1, dm_permission: false },
];

const r = await fetch(path, {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    authorization: `Bot ${token}`,
  },
  body: JSON.stringify(body),
});

if (!r.ok) {
  const t = await r.text();
  console.error(r.status, t);
  process.exit(1);
}
console.log("Comandos registados", guildId ? `(guild ${guildId})` : "(global)");
