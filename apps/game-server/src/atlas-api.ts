import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import { PREVIEW_MEMBER_KEY, STARTER_CAMPAIGN_ID } from "@utt/domain";
import { surrealStore } from "./persistence/surreal-store.js";
import { PolicyDeniedError, requireCampaignCapability, requireSceneCapability } from "./policy.js";

const ASSET_ROOT = process.env.SCENE_ASSET_ROOT ?? "/data/scene-assets";
const IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);

function apiError(response: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : "request failed";
  response.status(error instanceof PolicyDeniedError ? error.statusCode : 400).json({ error: message });
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    handler(request, response).catch((error: unknown) => {
      if (response.headersSent) next(error);
      else apiError(response, error);
    });
  };
}

function headerNumber(request: Request, name: string): number {
  const value = request.header(name);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} is required`);
  return parsed;
}

function safeSceneId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9-]{1,80}$/.test(value)) throw new Error("invalid scene id");
  return value;
}

export function configureAtlasHttp(app: Application): void {
  app.use("/assets", express.static(ASSET_ROOT, {
    fallthrough: false,
    index: false,
    maxAge: "5m"
  }));

  app.get("/api/atlas", asyncRoute(async (_request, response) => {
    await requireCampaignCapability(STARTER_CAMPAIGN_ID, PREVIEW_MEMBER_KEY, "world.read", { worldEntityId: null });
    response.setHeader("Cache-Control", "no-store");
    response.json(await surrealStore.loadAtlas());
  }));

  app.post("/api/scenes", express.json({ limit: "32kb" }), asyncRoute(async (request, response) => {
    await requireCampaignCapability(STARTER_CAMPAIGN_ID, PREVIEW_MEMBER_KEY, "world.scene.edit", { worldEntityId: null });
    const body = request.body as Record<string, unknown>;
    const scene = await surrealStore.createScene({
      name: body.name,
      kind: body.kind,
      gridKind: body.gridKind,
      gridSize: body.gridSize,
      gridVisible: body.gridVisible,
      loreSummary: body.loreSummary
    });
    response.status(201).json({ scene });
  }));

  app.post("/api/scenes/:sceneId/hotspots", express.json({ limit: "32kb" }), asyncRoute(async (request, response) => {
    const sceneId = safeSceneId(request.params.sceneId ?? "");
    await requireSceneCapability(sceneId, PREVIEW_MEMBER_KEY, "world.scene.edit");
    const body = request.body as Record<string, unknown>;
    if (typeof body.loreSummary === "string" && body.loreSummary.trim()) {
      await requireSceneCapability(sceneId, PREVIEW_MEMBER_KEY, "world.lore.edit");
    }
    const createLinkedScene = typeof body.createLinkedScene === "object" && body.createLinkedScene !== null
      ? body.createLinkedScene as { name?: unknown; kind?: unknown }
      : null;
    const result = await surrealStore.createHotspot({
      sceneId,
      label: body.label,
      x: body.x,
      y: body.y,
      linkedSceneId: body.linkedSceneId,
      linkedEntityId: body.linkedEntityId,
      loreSummary: body.loreSummary,
      createLinkedScene
    });
    response.status(201).json(result);
  }));

  app.post(
    "/api/scenes/:sceneId/background",
    express.raw({ type: [...IMAGE_TYPES.keys()], limit: "12mb" }),
    asyncRoute(async (request, response) => {
      const sceneId = safeSceneId(request.params.sceneId ?? "");
      await requireSceneCapability(sceneId, PREVIEW_MEMBER_KEY, "world.scene.edit");
      const scene = await surrealStore.getScene(sceneId);
      if (!scene) throw new Error("scene not found");
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw new Error("image body is required");
      const contentType = request.header("content-type")?.split(";")[0] ?? "";
      const extension = IMAGE_TYPES.get(contentType);
      if (!extension) throw new Error("image must be PNG, JPEG, or WebP");
      const width = headerNumber(request, "x-image-width");
      const height = headerNumber(request, "x-image-height");
      const directory = join(ASSET_ROOT, sceneId);
      await mkdir(directory, { recursive: true });
      const fileName = `${randomUUID()}.${extension}`;
      const assetKey = `${sceneId}/${fileName}`;
      const filePath = join(directory, fileName);
      await writeFile(filePath, request.body, { flag: "wx" });
      try {
        const updated = await surrealStore.setSceneBackground(sceneId, assetKey, width, height);
        if (scene.backgroundAssetKey) {
          await unlink(join(ASSET_ROOT, scene.backgroundAssetKey)).catch(() => undefined);
        }
        response.status(201).json({ scene: updated });
      } catch (error) {
        await unlink(filePath).catch(() => undefined);
        throw error;
      }
    })
  );
}
