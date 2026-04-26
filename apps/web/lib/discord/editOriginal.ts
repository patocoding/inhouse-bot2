type InteractionLike = {
  application_id: string;
  token: string;
};

export async function editOriginal(
  it: InteractionLike,
  data: { content: string; embeds?: object[] } | { content?: string; embeds?: object[] }
) {
  const id = it.application_id;
  const t = it.token;
  const u = `https://discord.com/api/v10/webhooks/${id}/${t}/messages/@original`;
  const r = await fetch(u, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`editOriginal: ${r.status} ${errText}`);
  }
}
