import { useMemo, useState } from "react";
import { readDnd2024Data, type Dnd2024CharacterData } from "@utt/rules-dnd2024";
import type { ProductCharacterDto, ProductCharacterPrivateStateDto, ProductSnapshotDto } from "@utt/protocol";
import type { LiveCharacterView } from "../live-room.js";
import { mutateProduct, readProductPrivateState } from "../product.js";
import { CharacterBuilder } from "./CharacterBuilder.js";

type BuilderMode =
  | { kind: "level1"; identityId: string; campaignId: string }
  | { kind: "request"; characterId: string }
  | { kind: "direct"; characterId: string }
  | null;

interface Props {
  data: ProductSnapshotDto;
  onTable: (id: string) => void;
  onRefresh: () => Promise<void>;
}

function asBuilderCharacter(character: ProductCharacterDto): LiveCharacterView {
  return {
    id: character.id, name: character.name, rulesetId: character.rulesetId,
    schemaVersion: character.schemaVersion, rulesetData: { ...character.rulesetData },
    resources: character.hp ? [{ id: `${character.id}-hp`, key: "hp", label: "Hit points", current: character.hp.current, max: character.hp.max }] : []
  };
}

function versionLabel(character: ProductCharacterDto): string {
  const data = character.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  return data ? `Level ${data.level} ${data.classId}` : character.rulesetId;
}

function RequestDiff({ current, proposedName, proposedMaxHp, proposedRulesetData }: {
  current: ProductCharacterDto; proposedName: string; proposedMaxHp: number; proposedRulesetData: Record<string, unknown>;
}) {
  const currentData = current.rulesetId === "dnd2024" ? readDnd2024Data(current.rulesetData) : null;
  const proposedData = current.rulesetId === "dnd2024" ? readDnd2024Data(proposedRulesetData) : null;
  const changes = [
    current.name !== proposedName ? `Name: ${current.name} → ${proposedName}` : null,
    current.hp && current.hp.max !== proposedMaxHp ? `Max HP: ${current.hp.max} → ${proposedMaxHp}` : null,
    currentData && proposedData && currentData.level !== proposedData.level ? `Level: ${currentData.level} → ${proposedData.level}` : null,
    JSON.stringify(current.rulesetData) !== JSON.stringify(proposedRulesetData) ? "Build details changed" : null
  ].filter((item): item is string => Boolean(item));
  return <ul className="character-change-diff">{changes.length ? changes.map((item) => <li key={item}>{item}</li>) : <li>No structural difference detected.</li>}</ul>;
}

export function CharacterLifecycleHome({ data, onTable, onRefresh }: Props) {
  const [builder, setBuilder] = useState<BuilderMode>(null);
  const [newIdentityName, setNewIdentityName] = useState("");
  const [creatingIdentity, setCreatingIdentity] = useState(false);
  const [copySource, setCopySource] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [privateCharacterId, setPrivateCharacterId] = useState<string | null>(null);
  const [privateNotes, setPrivateNotes] = useState("");
  const [privateLoading, setPrivateLoading] = useState(false);

  const editedCharacter = useMemo(() => {
    if (!builder || builder.kind === "level1") return null;
    return data.characters.find((item) => item.id === builder.characterId) ?? null;
  }, [builder, data.characters]);

  const runMutation = async (task: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true); setError(null); setNotice(null);
    try { await task(); await onRefresh(); setNotice(success); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Character lifecycle action failed"); return false; }
    finally { setBusy(false); }
  };

  const createIdentity = async () => {
    const name = newIdentityName.trim();
    if (!name) return;
    const ok = await runMutation(
      () => mutateProduct("/character-identities", "POST", { displayName: name, rulesetId: "dnd2024" }),
      `${name} now has a Character Identity.`
    );
    if (ok) { setNewIdentityName(""); setCreatingIdentity(false); }
  };

  const saveBuilder = async (payload: { name: string; maxHp: number; rulesetData: Dnd2024CharacterData }) => {
    if (!builder) return;
    let ok: boolean;
    if (builder.kind === "level1") {
      ok = await runMutation(
        () => mutateProduct(`/character-identities/${encodeURIComponent(builder.identityId)}/campaigns/${encodeURIComponent(builder.campaignId)}`, "POST", {
          source: "level1", name: payload.name, maxHp: payload.maxHp, rulesetData: payload.rulesetData
        }),
        `${payload.name} was added to the campaign from level 1.`
      );
    } else if (builder.kind === "request") {
      ok = await runMutation(
        () => mutateProduct(`/campaign-characters/${encodeURIComponent(builder.characterId)}/change-requests`, "POST", {
          name: payload.name, maxHp: payload.maxHp, rulesetData: payload.rulesetData, message: "Structural build update"
        }),
        "Change request sent for DM review."
      );
    } else {
      ok = await runMutation(
        () => mutateProduct(`/campaign-characters/${encodeURIComponent(builder.characterId)}/direct`, "PATCH", {
          name: payload.name, maxHp: payload.maxHp, rulesetData: payload.rulesetData
        }),
        "Campaign character updated directly."
      );
    }
    if (ok) setBuilder(null);
  };

  const copyCurrentBuild = async (identityId: string, campaignId: string) => {
    const key = `${identityId}:${campaignId}`;
    const sourceCharacterId = copySource[key] ?? data.identities.find((item) => item.id === identityId)?.campaignCharacterIds[0];
    if (!sourceCharacterId) { setError("Choose an existing campaign version to copy."); return; }
    await runMutation(
      () => mutateProduct(`/character-identities/${encodeURIComponent(identityId)}/campaigns/${encodeURIComponent(campaignId)}`, "POST", {
        source: "current_build", sourceCharacterId
      }),
      "Current structural build copied into an independent campaign version."
    );
  };

  const addToTable = async (characterId: string, tableId: string) => {
    await runMutation(
      () => mutateProduct(`/campaign-characters/${encodeURIComponent(characterId)}/tables/${encodeURIComponent(tableId)}`, "POST", {}),
      "Character added to the Table by reference."
    );
  };

  const resolveRequest = async (requestId: string, decision: "approve" | "reject") => {
    await runMutation(
      () => mutateProduct(`/change-requests/${encodeURIComponent(requestId)}/resolve`, "POST", { decision }),
      decision === "approve" ? "Change request approved and applied." : "Change request rejected."
    );
  };

  const openPrivateState = async (characterId: string) => {
    setPrivateCharacterId(characterId); setPrivateLoading(true); setError(null);
    try {
      const state = await readProductPrivateState<ProductCharacterPrivateStateDto>(characterId);
      setPrivateNotes(typeof state.data.notes === "string" ? state.data.notes : "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load private state"); }
    finally { setPrivateLoading(false); }
  };

  const savePrivateState = async () => {
    if (!privateCharacterId) return;
    const ok = await runMutation(
      () => mutateProduct(`/campaign-characters/${encodeURIComponent(privateCharacterId)}/private`, "PUT", { data: { notes: privateNotes } }),
      "DM-private character state saved separately."
    );
    if (ok) setPrivateCharacterId(null);
  };

  const builderCharacter = editedCharacter ? asBuilderCharacter(editedCharacter) : null;

  return <>
    {builder ? <div className="sheet-backdrop character-lifecycle-builder" role="presentation" onMouseDown={() => setBuilder(null)}>
      <section className="atlas-sheet character-library character-library-v2" onMouseDown={(event) => event.stopPropagation()}>
        <CharacterBuilder
          character={builder.kind === "level1" ? null : builderCharacter}
          fixedLevel={builder.kind === "level1" ? 1 : undefined}
          onSave={(payload) => void saveBuilder(payload)}
          onCancel={() => setBuilder(null)}
        />
      </section>
    </div> : null}

    {privateCharacterId ? <div className="sheet-backdrop" role="presentation" onMouseDown={() => setPrivateCharacterId(null)}>
      <section className="atlas-sheet character-private-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="sheet-kicker">DM-private state</span><h2>Hidden character notes</h2>
        <p>This data is stored outside the player-facing product snapshot. Auth is still deferred, so this is a structural boundary, not a security guarantee yet.</p>
        <label><span>Private notes</span><textarea value={privateNotes} disabled={privateLoading} onChange={(event) => setPrivateNotes(event.target.value)} rows={8} placeholder="Hidden items, curses, secret effects, notes…" /></label>
        <div className="sheet-actions"><button type="button" className="ghost-button" onClick={() => setPrivateCharacterId(null)}>Cancel</button><button type="button" className="game-button primary" disabled={busy || privateLoading} onClick={() => void savePrivateState()}>Save private state</button></div>
      </section>
    </div> : null}

    <section className="product-page-heading characters-heading character-lifecycle-heading">
      <div><span className="product-kicker">Characters</span><h1>Your characters.</h1><p>One identity can enter multiple campaigns. Every campaign version evolves independently; Tables inside that campaign reference the same version.</p></div>
      <button className="product-primary" type="button" onClick={() => setCreatingIdentity((value) => !value)}>+ Character Identity</button>
    </section>

    {creatingIdentity ? <section className="character-identity-create">
      <div><span className="product-kicker">New identity</span><h2>Who is this character?</h2><p>Create the reusable identity first. Campaign builds come next.</p></div>
      <label><span>Name</span><input value={newIdentityName} onChange={(event) => setNewIdentityName(event.target.value)} maxLength={80} placeholder="Adventurer name" /></label>
      <div className="identity-create-actions"><button type="button" className="ghost-button" onClick={() => setCreatingIdentity(false)}>Cancel</button><button type="button" className="product-primary" disabled={busy || !newIdentityName.trim()} onClick={() => void createIdentity()}>Create identity</button></div>
    </section> : null}

    {error ? <div className="product-feedback error">{error}</div> : null}
    {notice ? <div className="product-feedback success">{notice}</div> : null}

    <div className="character-identities-grid">
      {data.identities.map((identity) => {
        const versions = data.characters.filter((character) => character.identityId === identity.id);
        const missingCampaigns = data.campaigns.filter((campaign) => !versions.some((character) => character.campaignId === campaign.id));
        return <article className="character-identity-card" key={identity.id}>
          <header className="identity-card-head"><div className="character-avatar large">{identity.displayName.slice(0, 1)}</div><div><span className="product-kicker">Character Identity</span><h2>{identity.displayName}</h2><small>{versions.length} campaign version{versions.length === 1 ? "" : "s"}</small></div></header>

          {missingCampaigns.map((campaign) => {
            const key = `${identity.id}:${campaign.id}`;
            return <section className="identity-add-campaign" key={campaign.id}>
              <div><span>Add to campaign</span><strong>{campaign.name}</strong><small>Creates an independent CampaignCharacter.</small></div>
              <div className="identity-import-actions"><button type="button" disabled={busy} onClick={() => setBuilder({ kind: "level1", identityId: identity.id, campaignId: campaign.id })}>Start at level 1</button>
                {versions.length ? <><select aria-label={`Current build source for ${campaign.name}`} value={copySource[key] ?? versions[0]?.id ?? ""} onChange={(event) => setCopySource((current) => ({ ...current, [key]: event.target.value }))}>{versions.map((version) => { const sourceCampaign = data.campaigns.find((item) => item.id === version.campaignId); return <option value={version.id} key={version.id}>{sourceCampaign?.name ?? "Campaign"} · {versionLabel(version)}</option>; })}</select><button type="button" disabled={busy} onClick={() => void copyCurrentBuild(identity.id, campaign.id)}>Copy current build</button></> : null}
              </div>
            </section>;
          })}

          <div className="campaign-character-versions">
            {versions.map((character) => {
              const campaign = data.campaigns.find((item) => item.id === character.campaignId);
              const campaignTables = data.tables.filter((table) => table.campaignId === character.campaignId);
              const availableTables = campaignTables.filter((table) => !character.tableIds.includes(table.id));
              const pending = data.changeRequests.filter((request) => request.characterId === character.id && request.status === "pending");
              const canManage = Boolean(campaign?.roleLabels.some((role) => role === "owner" || role === "dm" || role === "co_dm"));
              return <section className="campaign-character-version" key={character.id}>
                <div className="campaign-version-head"><div><span className="product-kicker">Campaign version</span><h3>{campaign?.name ?? "Unknown campaign"}</h3><strong>{character.name}</strong><small>{versionLabel(character)} · {character.hp ? `${character.hp.current}/${character.hp.max} HP` : "No HP"}</small></div><span className="character-source-badge">{character.sourceKind.replaceAll("_", " ")}</span></div>
                <div className="character-table-tags">{character.tableIds.map((tableId) => { const table = data.tables.find((item) => item.id === tableId); return table ? <button type="button" key={tableId} onClick={() => onTable(tableId)}>{table.name} <span>→</span></button> : null; })}</div>
                {availableTables.length ? <div className="character-add-table"><span>Add to Table</span>{availableTables.map((table) => <button type="button" disabled={busy} key={table.id} onClick={() => void addToTable(character.id, table.id)}>+ {table.name}</button>)}</div> : null}
                <div className="campaign-character-actions"><button type="button" disabled={busy} onClick={() => setBuilder({ kind: "request", characterId: character.id })}>Request changes</button>{canManage ? <><button type="button" disabled={busy} onClick={() => setBuilder({ kind: "direct", characterId: character.id })}>DM override</button><button type="button" disabled={busy} onClick={() => void openPrivateState(character.id)}>Private state</button></> : null}</div>

                {pending.map((request) => <article className="character-change-request" key={request.id}>
                  <header><div><span className="product-kicker">Pending change request</span><strong>{request.message || "Structural update"}</strong></div><small>{request.requestedBy}</small></header>
                  <RequestDiff current={character} proposedName={request.proposedName} proposedMaxHp={request.proposedMaxHp} proposedRulesetData={request.proposedRulesetData} />
                  {canManage ? <div className="request-resolution"><button type="button" disabled={busy} onClick={() => void resolveRequest(request.id, "reject")}>Reject</button><button className="product-primary" type="button" disabled={busy} onClick={() => void resolveRequest(request.id, "approve")}>Approve & apply</button></div> : null}
                </article>)}
              </section>;
            })}
          </div>
        </article>;
      })}
    </div>
  </>;
}
