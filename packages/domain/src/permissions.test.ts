import { describe, expect, it } from "vitest";
import {
  campaignRolePreset,
  evaluateCampaignAccess,
  evaluateTableAccess,
  normalizeCapabilityScopes,
  tableRolePreset,
  type CampaignCapability
} from "./permissions.js";

const scopedMember = {
  capabilities: ["world.scene.edit"] as CampaignCapability[],
  scopes: [{ kind: "world_subgraph" as const, worldEntityId: "greyhaven", includeDescendants: true }]
};

describe("capability policy", () => {
  it("does not grant access from a role label alone", () => {
    expect(evaluateCampaignAccess({ capabilities: [], scopes: [{ kind: "campaign", worldEntityId: null, includeDescendants: true }] }, "world.scene.edit")).toEqual({ allowed: false, reason: "missing_capability" });
  });

  it("applies campaign and exact/subgraph world scopes", () => {
    expect(evaluateCampaignAccess(scopedMember, "world.scene.edit", { worldEntityId: "greyhaven" }).allowed).toBe(true);
    expect(evaluateCampaignAccess(scopedMember, "world.scene.edit", { worldEntityId: "market", ancestorEntityIds: ["greyhaven"] }).allowed).toBe(true);
    expect(evaluateCampaignAccess(scopedMember, "world.scene.edit", { worldEntityId: "copper-road" })).toEqual({ allowed: false, reason: "outside_scope" });
    expect(evaluateCampaignAccess(scopedMember, "world.scene.edit", { worldEntityId: null })).toEqual({ allowed: false, reason: "outside_scope" });
  });

  it("keeps table capabilities independent from campaign roles", () => {
    expect(evaluateTableAccess({ capabilities: ["session.join"] }, "session.run").allowed).toBe(false);
    expect(evaluateTableAccess({ capabilities: ["session.run"] }, "session.run").allowed).toBe(true);
  });

  it("uses role packages only as configuration presets", () => {
    const owner = campaignRolePreset("owner");
    const coDm = campaignRolePreset("co_dm");
    expect(owner.capabilities).toContain("campaign.members.manage");
    expect(coDm.capabilities).not.toContain("campaign.members.manage");
    expect(campaignRolePreset("player").capabilities).toEqual(["character.propose"]);
    expect(tableRolePreset("player").capabilities).toEqual(["session.join", "character.play"]);
  });

  it("normalizes scope payloads without inventing descendants", () => {
    expect(normalizeCapabilityScopes([{ kind: "campaign" }])).toEqual([{ kind: "campaign", worldEntityId: null, includeDescendants: true }]);
    expect(normalizeCapabilityScopes([{ kind: "world_subgraph", worldEntityId: " greyhaven ", includeDescendants: true }])).toEqual([{ kind: "world_subgraph", worldEntityId: "greyhaven", includeDescendants: true }]);
    expect(() => normalizeCapabilityScopes([{ kind: "world_subgraph", worldEntityId: "" }])).toThrow();
  });
});