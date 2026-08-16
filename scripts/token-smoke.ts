import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "@colyseus/sdk";
import { LiveRoomState, MESSAGE, ROOM_NAME, SERVER_MESSAGE } from "@utt/protocol";

const endpoint = process.env.UTT_ENDPOINT ?? "http://100.91.197.37:4310/game";
const apiBase = endpoint.replace(/\/game\/?$/, "/game/api");
const mode = process.env.SMOKE_MODE ?? "mutate";
const evidencePath = resolve(".runtime/token-smoke-state.json");

interface Evidence { roomId: string; tokenId: string; sceneId: string; sequence: number; x: number; y: number }
const sleep = (ms: number) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function waitFor(predicate: () => boolean, description: string, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { if (predicate()) return; await sleep(25); }
  throw new Error(`Timed out waiting for ${description}`);
}
async function join(name: string) {
  return new Client(endpoint).joinOrCreate(ROOM_NAME, { clientName: name }, LiveRoomState);
}
async function atlas() {
  const response = await fetch(`${apiBase}/atlas`);
  assert(response.ok, `atlas request failed: ${response.status}`);
  return response.json() as Promise<{ scenes: Array<{ id: string; name: string }>; tokens: Array<{ id: string; x: number; y: number }> }>;
}
async function mutateAndVerify() {
  const data = await atlas();
  const scene = data.scenes.find((item) => item.name === "Copper Road Ambush") ?? data.scenes[0];
  assert(scene, "no scene available for token smoke");
  const owner = await join("Token-Owner");
  const guest = await join("Token-Guest");
  try {
    await waitFor(() => owner.state.connectedPlayers >= 2 && guest.state.connectedPlayers >= 2, "two clients");
    if (owner.state.activeSceneId !== scene.id) {
      owner.send(MESSAGE.presentScene, { sceneId: scene.id });
      await waitFor(() => owner.state.activeSceneId === scene.id && guest.state.activeSceneId === scene.id, "shared target scene");
    }
    const beforeCreate = owner.state.eventSequence;
    owner.send(MESSAGE.createToken, { sceneId: scene.id, kind: "player", label: "VS003 Ownership Probe", x: .28, y: .42, claim: true });
    await waitFor(() => owner.state.eventSequence === beforeCreate + 1 && guest.state.eventSequence === beforeCreate + 1, "token creation event");
    const token = Array.from(owner.state.tokens.values()).find((item) => item.label === "VS003 Ownership Probe");
    assert(token, "created token missing from owner state");
    await waitFor(() => guest.state.tokens.has(token.id), "token replication to guest");
    assert(token.controllerName === "Token-Owner", `unexpected controller ${token.controllerName}`);

    let guestError = "";
    guest.onMessage(SERVER_MESSAGE.commandError, (message: { message: string }) => { guestError = message.message; });
    const beforeRejectedMove = owner.state.eventSequence;
    guest.send(MESSAGE.moveToken, { tokenId: token.id, x: .82, y: .74 });
    await waitFor(() => guestError.includes("controlled by Token-Owner"), "ownership rejection");
    await sleep(100);
    assert(owner.state.eventSequence === beforeRejectedMove, "rejected move changed event sequence");
    assert(Math.abs((owner.state.tokens.get(token.id)?.x ?? 0) - .28) < .0001, "guest changed claimed token position");

    owner.send(MESSAGE.moveToken, { tokenId: token.id, x: .64, y: .57 });
    await waitFor(() => owner.state.eventSequence === beforeRejectedMove + 1 && guest.state.eventSequence === beforeRejectedMove + 1, "owner move event");
    await waitFor(() => Math.abs((owner.state.tokens.get(token.id)?.x ?? 0) - .64) < .0001 && Math.abs((guest.state.tokens.get(token.id)?.y ?? 0) - .57) < .0001, "replicated owner move");
    const durable = await atlas();
    const saved = durable.tokens.find((item) => item.id === token.id);
    assert(saved && Math.abs(saved.x - .64) < .0001 && Math.abs(saved.y - .57) < .0001, "durable token position did not match live state");

    const evidence: Evidence = { roomId: owner.roomId, tokenId: token.id, sceneId: scene.id, sequence: owner.state.eventSequence, x: .64, y: .57 };
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, mode, endpoint, ...evidence, rejectedGuestMove: guestError }));
  } finally {
    await Promise.allSettled([owner.leave(), guest.leave()]);
  }
}

async function verifyRecovery() {
  const expected = JSON.parse(await readFile(evidencePath, "utf8")) as Evidence;
  const room = await join("Token-Recovery");
  try {
    assert(room.roomId !== expected.roomId, "expected a new room after restart");
    await waitFor(() => room.state.eventSequence === expected.sequence, "recovered token sequence");
    await waitFor(() => room.state.activeSceneId === expected.sceneId && room.state.tokens.has(expected.tokenId), "recovered active-scene token");
    const token = room.state.tokens.get(expected.tokenId);
    assert(token && Math.abs(token.x - expected.x) < .0001 && Math.abs(token.y - expected.y) < .0001, "token coordinates did not recover");
    const durable = await atlas();
    assert(durable.tokens.some((item) => item.id === expected.tokenId), "token missing from durable Atlas after restart");
    console.log(JSON.stringify({ ok: true, mode, endpoint, previousRoomId: expected.roomId, newRoomId: room.roomId, ...expected }));
  } finally {
    await room.leave();
  }
}

async function main() {
  if (mode === "verify-recovery") await verifyRecovery();
  else await mutateAndVerify();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
