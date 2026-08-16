import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_NAME } from "@utt/protocol";
import { surrealStore } from "./persistence/surreal-store.js";
import { VerticalSliceRoom } from "./rooms/vertical-slice-room.js";
import { configureAtlasHttp } from "./atlas-api.js";

const port = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(port) || port <= 0) throw new Error("PORT must be a positive integer");

const server = new Server({
  transport: new WebSocketTransport(),
  greet: false,
  beforeListen: () => surrealStore.connect(),
  express: (app) => {
    configureAtlasHttp(app);
    app.get("/healthz", (_request, response) => {
      response.json({ ok: true, service: "utt-game-server" });
    });
  }
});

server.define(ROOM_NAME, VerticalSliceRoom);
await server.listen(port, "0.0.0.0");
console.info(`[game-server] listening on ${port}`);
