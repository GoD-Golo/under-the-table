import { matchMaker } from "@colyseus/core";
import { json, type Application } from "express";
import { PREVIEW_MEMBER_KEY } from "@utt/domain";
import { DND2024_RULESET_ID, normalizeDnd2024Data } from "@utt/rules-dnd2024";
import { ROOM_NAME, SESSION_ID, type ProductSnapshotDto } from "@utt/protocol";
import { surrealStore } from "./persistence/surreal-store.js";
import type { VerticalSliceRoom } from "./rooms/vertical-slice-room.js";

const productJson = json({ limit: "64kb" });

async function refreshLiveCharacters(): Promise<void> {
  const rooms = await matchMaker.query({ name: ROOM_NAME });
  await Promise.all(rooms.map((room) => matchMaker.remoteRoomCall<VerticalSliceRoom>(room.roomId, "refreshCharactersFromPersistence", [])));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "product mutation failed";
}

async function buildProductSnapshot(): Promise<ProductSnapshotDto> {
  const foundation = await surrealStore.loadProductFoundation(SESSION_ID);
  const atlas = await surrealStore.loadAtlas();
  const sessionById = new Map<string, Awaited<ReturnType<typeof surrealStore.loadSnapshot>>>();
  for (const table of foundation.tables) {
    if (table.currentSessionId && !sessionById.has(table.currentSessionId)) {
      sessionById.set(table.currentSessionId, await surrealStore.loadSnapshot(table.currentSessionId));
    }
  }

  const campaignRoles = new Map(
    foundation.campaignMemberships.filter((membership) => membership.memberKey === PREVIEW_MEMBER_KEY)
      .map((membership) => [membership.campaignId, membership.roleLabels] as const)
  );
  const tableRoles = new Map(
    foundation.tableMemberships.filter((membership) => membership.memberKey === PREVIEW_MEMBER_KEY)
      .map((membership) => [membership.tableId, membership.roleLabels] as const)
  );
  const characterById = new Map(foundation.characters.map((character) => [character.definition.id, character] as const));
  const sceneById = new Map(atlas.scenes.map((scene) => [scene.id, scene] as const));
  const campaignCharacterIds = new Map<string, string[]>();
  const tableCharacterIds = new Map<string, string[]>();
  for (const membership of foundation.campaignCharacters) {
    const list = campaignCharacterIds.get(membership.campaignId) ?? [];
    list.push(membership.characterId);
    campaignCharacterIds.set(membership.campaignId, list);
  }
  for (const membership of foundation.tableCharacters) {
    const list = tableCharacterIds.get(membership.tableId) ?? [];
    list.push(membership.characterId);
    tableCharacterIds.set(membership.tableId, list);
  }

  return {
    viewer: { memberKey: PREVIEW_MEMBER_KEY, displayName: "Local Preview", authEnforced: false },
    campaigns: foundation.campaigns.map((campaign) => ({
      id: campaign.id, name: campaign.name, summary: campaign.summary,
      roleLabels: campaignRoles.get(campaign.id) ?? [],
      tableCount: foundation.tables.filter((table) => table.campaignId === campaign.id).length,
      characterCount: campaignCharacterIds.get(campaign.id)?.length ?? 0
    })),
    tables: foundation.tables.map((table) => {
      const snapshot = table.currentSessionId ? sessionById.get(table.currentSessionId) ?? null : null;
      const activeSceneId = snapshot?.activeSceneId ?? null;
      return {
        id: table.id, campaignId: table.campaignId, name: table.name, summary: table.summary,
        currentSessionId: table.currentSessionId, roleLabels: tableRoles.get(table.id) ?? [],
        characterIds: tableCharacterIds.get(table.id) ?? [], activeSceneId,
        activeSceneName: activeSceneId ? sceneById.get(activeSceneId)?.name ?? null : null
      };
    }),
    identities: foundation.identities.map((identity) => ({
      id: identity.id, ownerKey: identity.ownerKey, displayName: identity.displayName, rulesetId: identity.rulesetId,
      campaignCharacterIds: foundation.campaignCharacters.filter((item) => item.identityId === identity.id).map((item) => item.characterId)
    })),
    characters: foundation.campaignCharacters.flatMap((membership) => {
      const character = characterById.get(membership.characterId);
      if (!character) return [];
      const hp = character.resources.find((resource) => resource.key === "hp") ?? null;
      return [{
        id: character.definition.id, identityId: membership.identityId, campaignId: membership.campaignId,
        name: character.definition.name, rulesetId: character.definition.rulesetId,
        schemaVersion: character.definition.schemaVersion, rulesetData: { ...character.definition.rulesetData },
        hp: hp ? { current: hp.current, max: hp.max } : null,
        tableIds: foundation.tableCharacters.filter((item) => item.characterId === character.definition.id).map((item) => item.tableId),
        sourceKind: membership.sourceKind, sourceCharacterId: membership.sourceCharacterId,
        pendingChangeCount: foundation.changeRequests.filter((request) => request.characterId === character.definition.id && request.status === "pending").length
      }];
    }),
    changeRequests: foundation.changeRequests.map((request) => ({ ...request })),
    activity: foundation.tables.flatMap((table) => {
      const snapshot = table.currentSessionId ? sessionById.get(table.currentSessionId) ?? null : null;
      return (snapshot?.recentEvents ?? []).map((event) => ({
        sequence: event.sequence, tableId: table.id, actor: event.actor, summary: event.summary, at: event.at
      }));
    }).sort((a, b) => b.sequence - a.sequence).slice(0, 12)
  };
}

function normalizeStructuralRuleset(rulesetId: string, rulesetData: unknown): Record<string, unknown> {
  return rulesetId === DND2024_RULESET_ID ? { ...normalizeDnd2024Data(rulesetData) } : (rulesetData as Record<string, unknown>);
}

export function configureProductHttp(app: Application): void {
  app.get("/api/product", async (_request, response, next) => {
    try {
      response.setHeader("Cache-Control", "no-store");
      response.json(await buildProductSnapshot());
    } catch (error) { next(error); }
  });

  app.post("/api/product/character-identities", productJson, async (request, response) => {
    try {
      const identity = await surrealStore.createCharacterIdentity({
        ownerKey: PREVIEW_MEMBER_KEY, displayName: request.body?.displayName, rulesetId: request.body?.rulesetId ?? DND2024_RULESET_ID
      });
      response.status(201).json(identity);
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.post("/api/product/character-identities/:identityId/campaigns/:campaignId", productJson, async (request, response) => {
    try {
      const identity = await surrealStore.getCharacterIdentity(request.params.identityId);
      if (!identity) throw new Error("character identity not found");
      const source = request.body?.source;
      if (source !== "level1" && source !== "current_build") throw new Error("source must be level1 or current_build");
      let name: unknown;
      let maxHp: unknown;
      let rulesetData: unknown;
      let sourceCharacterId: string | null = null;
      if (source === "current_build") {
        if (typeof request.body?.sourceCharacterId !== "string") throw new Error("sourceCharacterId is required");
        const sourceId = request.body.sourceCharacterId as string;
        sourceCharacterId = sourceId;
        const sourceRuntime = await surrealStore.getCharacterRuntime(sourceId);
        if (!sourceRuntime) throw new Error("source character not found");
        const hp = sourceRuntime.resources.find((resource) => resource.key === "hp");
        if (!hp) throw new Error("source character has no hp resource");
        name = sourceRuntime.definition.name;
        maxHp = hp.max;
        rulesetData = { ...sourceRuntime.definition.rulesetData };
      } else {
        name = request.body?.name;
        maxHp = request.body?.maxHp;
        rulesetData = normalizeStructuralRuleset(identity.rulesetId, request.body?.rulesetData);
        if (identity.rulesetId === DND2024_RULESET_ID && normalizeDnd2024Data(rulesetData).level !== 1) {
          throw new Error("level-1 campaign import must start at level 1");
        }
      }
      const runtime = await surrealStore.createCampaignCharacter({
        identityId: identity.id, campaignId: request.params.campaignId, name, rulesetId: identity.rulesetId, maxHp, rulesetData,
        sourceKind: source, sourceCharacterId
      });
      response.status(201).json({ characterId: runtime.definition.id });
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.post("/api/product/campaign-characters/:characterId/tables/:tableId", productJson, async (request, response) => {
    try {
      const membership = await surrealStore.addCampaignCharacterToTable(request.params.characterId, request.params.tableId);
      await refreshLiveCharacters();
      response.status(201).json(membership);
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.post("/api/product/campaign-characters/:characterId/change-requests", productJson, async (request, response) => {
    try {
      const runtime = await surrealStore.getCharacterRuntime(request.params.characterId);
      const membership = await surrealStore.getCampaignCharacterMembership(request.params.characterId);
      if (!runtime || !membership) throw new Error("campaign character not found");
      const rulesetData = normalizeStructuralRuleset(runtime.definition.rulesetId, request.body?.rulesetData);
      const changeRequest = await surrealStore.createCharacterChangeRequest({
        campaignId: membership.campaignId, characterId: runtime.definition.id, requestedBy: PREVIEW_MEMBER_KEY,
        name: request.body?.name, maxHp: request.body?.maxHp, rulesetData, message: request.body?.message
      });
      response.status(201).json(changeRequest);
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.post("/api/product/change-requests/:requestId/resolve", productJson, async (request, response) => {
    try {
      const decision = request.body?.decision;
      if (decision !== "approve" && decision !== "reject") throw new Error("decision must be approve or reject");
      const changeRequest = await surrealStore.resolveCharacterChangeRequest({
        requestId: request.params.requestId, decision, resolvedBy: PREVIEW_MEMBER_KEY
      });
      if (decision === "approve") await refreshLiveCharacters();
      response.json(changeRequest);
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.patch("/api/product/campaign-characters/:characterId/direct", productJson, async (request, response) => {
    try {
      const runtime = await surrealStore.getCharacterRuntime(request.params.characterId);
      const membership = await surrealStore.getCampaignCharacterMembership(request.params.characterId);
      if (!runtime || !membership) throw new Error("campaign character not found");
      const rulesetData = normalizeStructuralRuleset(runtime.definition.rulesetId, request.body?.rulesetData);
      const updated = await surrealStore.updateCampaignCharacterDirect({
        characterId: runtime.definition.id, campaignId: membership.campaignId,
        name: request.body?.name, maxHp: request.body?.maxHp, rulesetData
      });
      await refreshLiveCharacters();
      response.json({ characterId: updated.definition.id });
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.get("/api/product/campaign-characters/:characterId/private", async (request, response) => {
    try {
      const membership = await surrealStore.getCampaignCharacterMembership(request.params.characterId);
      if (!membership) throw new Error("campaign character not found");
      response.setHeader("Cache-Control", "no-store");
      response.json(await surrealStore.getCampaignCharacterPrivateState(request.params.characterId, membership.campaignId));
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });

  app.put("/api/product/campaign-characters/:characterId/private", productJson, async (request, response) => {
    try {
      const membership = await surrealStore.getCampaignCharacterMembership(request.params.characterId);
      if (!membership) throw new Error("campaign character not found");
      response.json(await surrealStore.setCampaignCharacterPrivateState(
        request.params.characterId, membership.campaignId, request.body?.data ?? {}
      ));
    } catch (error) { response.status(400).json({ error: errorMessage(error) }); }
  });
}
