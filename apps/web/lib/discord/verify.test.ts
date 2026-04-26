import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { verifyDiscordRequest } from "./verify";

describe("verifyDiscordRequest", () => {
  it("rejeita assinatura inexistente ou timestamp em falta", () => {
    const body = Buffer.from('{"type":1}');
    expect(verifyDiscordRequest("00".repeat(32), null, "123", body)).toBe(false);
    expect(verifyDiscordRequest("00".repeat(32), "aabb", null, body)).toBe(false);
  });

  it("aceita assinatura ed25519 (mesmo algoritmo do Discord over timestamp+body)", () => {
    const keyPair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");
    const body = Buffer.from('{"type":1}');
    const timestamp = "1700000000";
    const msg = Buffer.concat([Buffer.from(timestamp, "utf8"), body]);
    const signature = nacl.sign.detached(new Uint8Array(msg), keyPair.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex");
    expect(verifyDiscordRequest(publicKeyHex, signatureHex, timestamp, body)).toBe(true);
  });

  it("rejeita se o corpo for alterado", () => {
    const keyPair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");
    const body = Buffer.from('{"type":1}');
    const timestamp = "1700000000";
    const msg = Buffer.concat([Buffer.from(timestamp, "utf8"), body]);
    const signature = nacl.sign.detached(new Uint8Array(msg), keyPair.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex");
    const wrongBody = Buffer.from('{"type":2}');
    expect(verifyDiscordRequest(publicKeyHex, signatureHex, timestamp, wrongBody)).toBe(false);
  });
});
