import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "@colyseus/sdk";
import { LiveRoomState, MESSAGE, ROOM_NAME } from "@utt/protocol";

const endpoint = process.env.UTT_ENDPOINT ?? "http://100.91.197.37:4310/game";
const mode = process.env.SMOKE_MODE ?? "mutate";
const evidencePath = resolve(".runtime/smoke-state.json");

interface RecoveryEvidence {
  roomId: string;
  sequence: number;
  hp: number;
  latestRollTotal: number;
  activeSceneId: string;
}

async function waitFor(predicate: () => boolean, description: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function join(name: string) {
  const client = new Client(endpoint);
  return client.joinOrCreate(ROOM_NAME, { clientName: name }, LiveRoomState);
}

async function mutateAndVerify(): Promise<void> {
  const roomA = await join("Smoke-A");
  const roomB = await join("Smoke-B");
  try {
    assert(roomA.roomId === roomB.roomId, "two clients did not join the same live room");
    await waitFor(() => roomA.state.connectedPlayers >= 2 && roomB.state.connectedPlayers >= 2, "two-client presence");

    const startingSequence = roomA.state.eventSequence;
    roomA.send(MESSAGE.roll, { sides: 20, modifier: 5 });
    await waitFor(
      () => roomA.state.eventSequence === startingSequence + 1 && roomB.state.eventSequence === startingSequence + 1,
      "synchronized roll event"
    );
    assert(roomA.state.latestRollNatural >= 1 && roomA.state.latestRollNatural <= 20, "server returned an invalid d20 natural roll");
    assert(roomA.state.latestRollTotal === roomA.state.latestRollNatural + 5, "roll modifier was not applied authoritatively");
    assert(roomB.state.latestRollTotal === roomA.state.latestRollTotal, "clients disagree on roll result");

    const hpBefore = roomA.state.hp;
    roomB.send(MESSAGE.adjustHp, { delta: -3 });
    await waitFor(
      () => roomA.state.eventSequence === startingSequence + 2 && roomB.state.eventSequence === startingSequence + 2,
      "synchronized HP event"
    );
    const expectedHp = Math.max(0, hpBefore - 3);
    assert(roomA.state.hp === expectedHp && roomB.state.hp === expectedHp, "clients disagree on authoritative HP state");

    const evidence: RecoveryEvidence = {
      roomId: roomA.roomId,
      sequence: roomA.state.eventSequence,
      hp: roomA.state.hp,
      latestRollTotal: roomA.state.latestRollTotal,
      activeSceneId: roomA.state.activeSceneId
    };
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, mode, endpoint, ...evidence }));
  } finally {
    await Promise.allSettled([roomA.leave(), roomB.leave()]);
  }
}

async function verifyRecovery(): Promise<void> {
  const expected = JSON.parse(await readFile(evidencePath, "utf8")) as RecoveryEvidence;
  const room = await join("Recovery-Check");
  try {
    assert(room.roomId !== expected.roomId, "expected a newly created room after process restart");
    await waitFor(
      () => room.state.eventSequence === expected.sequence,
      `recovered sequence ${expected.sequence}`
    );
    assert(room.state.hp === expected.hp, `expected HP ${expected.hp}, got ${room.state.hp}`);
    assert(room.state.latestRollTotal === expected.latestRollTotal, "latest roll did not survive room recovery");
    await waitFor(() => room.state.activeSceneId === expected.activeSceneId, `recovered active scene ${expected.activeSceneId}`);
    assert(room.state.activeSceneId === expected.activeSceneId, "active scene did not survive room recovery");
    console.log(JSON.stringify({ ok: true, mode, endpoint, previousRoomId: expected.roomId, newRoomId: room.roomId, sequence: room.state.eventSequence, hp: room.state.hp, activeSceneId: room.state.activeSceneId }));
  } finally {
    await room.leave();
  }
}

async function main(): Promise<void> {
  if (mode === "verify-recovery") {
    await verifyRecovery();
  } else {
    await mutateAndVerify();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
