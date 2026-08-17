import type { Application } from "express";
import { PREVIEW_MEMBER_KEY } from "@utt/domain";
import { SESSION_ID, type ProductSnapshotDto } from "@utt/protocol";
import { surrealStore } from "./persistence/surreal-store.js";

export function configureProductHttp(app: Application): void {
  app.get("/api/product", async (_request, response, next) => {
    try {
      const foundation = await surrealStore.loadProductFoundation(SESSION_ID);
      const atlas = await surrealStore.loadAtlas();
      const sessionById = new Map<string, Awaited<ReturnType<typeof surrealStore.loadSnapshot>>>();
      for (const table of foundation.tables) {
        if (table.currentSessionId && !sessionById.has(table.currentSessionId)) {
          sessionById.set(table.currentSessionId, await surrealStore.loadSnapshot(table.currentSessionId));
        }
      }

      const campaignRoles = new Map(
        foundation.campaignMemberships
          .filter((membership) => membership.memberKey === PREVIEW_MEMBER_KEY)
          .map((membership) => [membership.campaignId, membership.roleLabels] as const)
      );
      const tableRoles = new Map(
        foundation.tableMemberships
          .filter((membership) => membership.memberKey === PREVIEW_MEMBER_KEY)
          .map((membership) => [membership.tableId, membership.roleLabels] as const)
      );
      const characterById = new Map(foundation.characters.map((character) => [character.definition.id, character] as const));
      const sceneById = new Map(atlas.scenes.map((scene) => [scene.id, scene] as const));
      const campaignCharacterIds = new Map<string, string[]>();
      for (const membership of foundation.campaignCharacters) {
        const list = campaignCharacterIds.get(membership.campaignId) ?? [];
        list.push(membership.characterId);
        campaignCharacterIds.set(membership.campaignId, list);
      }
      const tableCharacterIds = new Map<string, string[]>();
      for (const membership of foundation.tableCharacters) {
        const list = tableCharacterIds.get(membership.tableId) ?? [];
        list.push(membership.characterId);
        tableCharacterIds.set(membership.tableId, list);
      }

      const payload: ProductSnapshotDto = {
        viewer: { memberKey: PREVIEW_MEMBER_KEY, displayName: "Local Preview", authEnforced: false },
        campaigns: foundation.campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          summary: campaign.summary,
          roleLabels: campaignRoles.get(campaign.id) ?? [],
          tableCount: foundation.tables.filter((table) => table.campaignId === campaign.id).length,
          characterCount: campaignCharacterIds.get(campaign.id)?.length ?? 0
        })),
        tables: foundation.tables.map((table) => {
          const snapshot = table.currentSessionId ? sessionById.get(table.currentSessionId) ?? null : null;
          const activeSceneId = snapshot?.activeSceneId ?? null;
          return {
            id: table.id,
            campaignId: table.campaignId,
            name: table.name,
            summary: table.summary,
            currentSessionId: table.currentSessionId,
            roleLabels: tableRoles.get(table.id) ?? [],
            characterIds: tableCharacterIds.get(table.id) ?? [],
            activeSceneId,
            activeSceneName: activeSceneId ? sceneById.get(activeSceneId)?.name ?? null : null
          };
        }),
        characters: foundation.campaignCharacters.flatMap((membership) => {
          const character = characterById.get(membership.characterId);
          if (!character) return [];
          const hp = character.resources.find((resource) => resource.key === "hp") ?? null;
          return [{
            id: character.definition.id,
            campaignId: membership.campaignId,
            name: character.definition.name,
            rulesetId: character.definition.rulesetId,
            schemaVersion: character.definition.schemaVersion,
            rulesetData: { ...character.definition.rulesetData },
            hp: hp ? { current: hp.current, max: hp.max } : null,
            tableIds: foundation.tableCharacters.filter((item) => item.characterId === character.definition.id).map((item) => item.tableId)
          }];
        }),
        activity: foundation.tables.flatMap((table) => {
          const snapshot = table.currentSessionId ? sessionById.get(table.currentSessionId) ?? null : null;
          return (snapshot?.recentEvents ?? []).map((event) => ({
            sequence: event.sequence,
            tableId: table.id,
            actor: event.actor,
            summary: event.summary,
            at: event.at
          }));
        }).sort((a, b) => b.sequence - a.sequence).slice(0, 12)
      };

      response.setHeader("Cache-Control", "no-store");
      response.json(payload);
    } catch (error) {
      next(error);
    }
  });
}
