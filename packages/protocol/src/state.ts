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


export class CharacterResourceState extends Schema {
  @type("string") id = "";
  @type("string") key = "";
  @type("string") label = "";
  @type("number") current = 0;
  @type("number") max = 0;
}

export class CharacterState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") rulesetId = "";
  @type("number") schemaVersion = 1;
  @type("string") rulesetDataJson = "{}";
  @type({ map: CharacterResourceState }) resources = new MapSchema<CharacterResourceState>();
}


export class InitiativeEntryState extends Schema {
  @type("string") id = "";
  @type("string") label = "";
  @type("number") score = 0;
  @type("string") characterId = "";
  @type("number") armorClass = 0;
  @type("number") currentHp = 0;
  @type("number") maxHp = 0;
}

export class LiveRoomState extends Schema {
  @type("string") sessionId = "";
  @type("string") activeSceneId = "";
  @type("number") connectedPlayers = 0;
  @type("number") eventSequence = 0;
  @type("number") latestRollSides = 0;
  @type("number") latestRollNatural = 0;
  @type("number") latestRollModifier = 0;
  @type("number") latestRollTotal = 0;
  @type("boolean") fogEnabled = false;
  @type("number") initiativeRound = 0;
  @type("number") initiativeActiveIndex = -1;
  @type([InitiativeEntryState]) initiativeEntries = new ArraySchema<InitiativeEntryState>();
  @type(["string"]) fogRevealedCells = new ArraySchema<string>();
  @type([EventState]) events = new ArraySchema<EventState>();
  @type({ map: TokenState }) tokens = new MapSchema<TokenState>();
  @type({ map: CharacterState }) characters = new MapSchema<CharacterState>();
}
