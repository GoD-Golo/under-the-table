import { describe, expect, it } from "vitest";
import {
  normalizeCampaignName,
  normalizeCampaignRoleLabels,
  normalizeCampaignSummary,
  normalizeTableName,
  normalizeTableRoleLabels
} from "./campaign.js";

describe("campaign and table boundaries", () => {
  it("normalizes campaign and table names", () => {
    expect(normalizeCampaignName("  West   Marches ")).toBe("West Marches");
    expect(normalizeTableName(" North   Expedition ")).toBe("North Expedition");
  });

  it("keeps summaries bounded and optional", () => {
    expect(normalizeCampaignSummary(undefined)).toBe("");
    expect(normalizeCampaignSummary("  Shared   frontier. ")).toBe("Shared frontier.");
    expect(normalizeCampaignSummary("x".repeat(1200))).toHaveLength(1000);
  });
  it("supports multi-role membership labels without inventing one global role", () => {
    expect(normalizeCampaignRoleLabels(["owner", "player", "owner"])).toEqual(["owner", "player"]);
    expect(normalizeTableRoleLabels(["dm", "player"])).toEqual(["dm", "player"]);
  });

  it("rejects unknown role labels", () => {
    expect(() => normalizeCampaignRoleLabels(["admin"])).toThrow();
    expect(() => normalizeTableRoleLabels(["owner"])).toThrow();
  });
});
