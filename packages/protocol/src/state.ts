import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class EventState extends Schema {
  @type("number") sequence = 0;
  @type("string") kind = "";
  @type("string") actor = "";
  @type("string") summary = "";
  @type("string") at = "";
}

export class TokenState extends Schema {
  @type("string") id = "";
  @type("string") sceneId = "";
  @type("string") kind = "object";
  @type("string") label = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") controllerName = "";
}

export class LiveRoomState extends Schema {
  @type("string") sessionId = "";
  @type("string") characterName = "";
  @type("string") activeSceneId = "";
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") connectedPlayers = 0;
  @type("number") eventSequence = 0;
  @type("number") latestRollSides = 0;
  @type("number") latestRollNatural = 0;
  @type("number") latestRollModifier = 0;
  @type("number") latestRollTotal = 0;
  @type([EventState]) events = new ArraySchema<EventState>();
  @type({ map: TokenState }) tokens = new MapSchema<TokenState>();
}
