import nacl from "tweetnacl";

/**
 * https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */
export function verifyDiscordRequest(
  publicKeyHex: string,
  signatureHex: string | null,
  timestamp: string | null,
  bodyBuffer: Buffer
): boolean {
  if (!signatureHex || !timestamp) return false;
  try {
    const publicKey = Buffer.from(publicKeyHex, "hex");
    const signature = Buffer.from(signatureHex, "hex");
    const msg = Buffer.concat([Buffer.from(timestamp, "utf8"), bodyBuffer]);
    return nacl.sign.detached.verify(
      new Uint8Array(msg),
      new Uint8Array(signature),
      new Uint8Array(publicKey)
    );
  } catch {
    return false;
  }
}
