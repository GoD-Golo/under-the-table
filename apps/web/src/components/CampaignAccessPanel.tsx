import { useEffect, useMemo, useState } from "react";
import type {
  ProductCampaignCapability,
  ProductCampaignDto,
  ProductCampaignMembershipDto,
  ProductCapabilityScopeDto,
  ProductSnapshotDto,
  ProductTableCapability
} from "@utt/protocol";
import { mutateProduct } from "../product.js";

const campaignCapabilities: { id: ProductCampaignCapability; label: string }[] = [
  { id: "campaign.members.manage", label: "Manage collaborators" },
  { id: "world.read", label: "Read world" },
  { id: "world.scene.edit", label: "Edit scenes" },
  { id: "world.lore.edit", label: "Edit lore" },
  { id: "world.npc.manage", label: "Manage NPCs" },
  { id: "character.propose", label: "Propose character changes" },
  { id: "character.review", label: "Review character changes" },
  { id: "character.edit", label: "Direct character edit" },
  { id: "character.private", label: "Private character state" }
];
const tableCapabilities: { id: ProductTableCapability; label: string }[] = [
  { id: "session.join", label: "Join" }, { id: "session.run", label: "Run session" },
  { id: "session.present", label: "Present" }, { id: "table.manage", label: "Manage table" },
  { id: "character.play", label: "Play characters" }
];
type CollaboratorRole = "dm" | "co_dm" | "player";
type TableRole = "dm" | "co_dm" | "player";

interface Props { data: ProductSnapshotDto; campaign: ProductCampaignDto; onRefresh: () => Promise<void> }

function toggle<T extends string>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function scopeFrom(kind: "campaign" | "world_subgraph", worldEntityId: string, includeDescendants: boolean): ProductCapabilityScopeDto[] {
  return kind === "campaign"
    ? [{ kind: "campaign", worldEntityId: null, includeDescendants: true }]
    : [{ kind: "world_subgraph", worldEntityId, includeDescendants }];
}

function CollaboratorCard({ data, campaign, member, onRefresh }: Props & { member: ProductCampaignMembershipDto }) {
  const [displayName, setDisplayName] = useState(member.displayName);
  const [role, setRole] = useState<CollaboratorRole>((member.roleLabels.find((item): item is CollaboratorRole => item === "dm" || item === "co_dm" || item === "player")) ?? "player");
  const [capabilities, setCapabilities] = useState<ProductCampaignCapability[]>(member.capabilities);
  const primaryScope = member.scopes[0] ?? { kind: "campaign" as const, worldEntityId: null, includeDescendants: true };
  const [scopeKind, setScopeKind] = useState<"campaign" | "world_subgraph">(primaryScope.kind);
  const [worldEntityId, setWorldEntityId] = useState(primaryScope.worldEntityId ?? data.worldEntities[0]?.id ?? "");
  const [includeDescendants, setIncludeDescendants] = useState(primaryScope.includeDescendants);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewCapability, setPreviewCapability] = useState<ProductCampaignCapability>("world.scene.edit");
  const [previewEntityId, setPreviewEntityId] = useState(data.worldEntities[0]?.id ?? "");
  const [preview, setPreview] = useState<{ allowed: boolean; reason: string } | null>(null);

  useEffect(() => {
    setDisplayName(member.displayName);
    setCapabilities(member.capabilities);
    const next = member.scopes[0] ?? { kind: "campaign" as const, worldEntityId: null, includeDescendants: true };
    setScopeKind(next.kind); setWorldEntityId(next.worldEntityId ?? data.worldEntities[0]?.id ?? ""); setIncludeDescendants(next.includeDescendants);
  }, [data.worldEntities, member]);

  const tables = data.tables.filter((table) => table.campaignId === campaign.id);
  const tableMemberships = useMemo(
    () => new Map(data.tableMemberships.filter((item) => item.memberKey === member.memberKey).map((item) => [item.tableId, item] as const)),
    [data.tableMemberships, member.memberKey]
  );

  const run = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true); setFeedback(null);
    try { await task(); await onRefresh(); setFeedback(message); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Access update failed"); }
    finally { setBusy(false); }
  };

  const saveCampaign = () => run(
    () => mutateProduct(`/campaigns/${campaign.id}/members/${encodeURIComponent(member.memberKey)}`, "PUT", {
      displayName, roleLabels: [role], capabilities,
      scopes: scopeFrom(scopeKind, worldEntityId, includeDescendants)
    }),
    "Campaign access saved."
  );

  const revokeCampaign = () => run(
    () => mutateProduct(`/campaigns/${campaign.id}/members/${encodeURIComponent(member.memberKey)}`, "DELETE"),
    "Collaborator revoked from campaign."
  );

  const testAccess = async () => {
    setBusy(true); setFeedback(null);
    try {
      const result = await mutateProduct<{ decision: { allowed: boolean; reason: string } }>(
        `/campaigns/${campaign.id}/policy-preview`, "POST", {
          memberKey: member.memberKey, capability: previewCapability,
          worldEntityId: previewEntityId || null, ancestorEntityIds: []
        }
      );
      setPreview(result.decision);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Policy preview failed"); }
    finally { setBusy(false); }
  };

  return <article className="campaign-access-card">
    <header><div><span className="product-kicker">Collaborator</span><h3>{member.displayName}</h3><small>{member.memberKey}</small></div><span className="access-role-pill">{role.replace("_", "-")}</span></header>
    <div className="access-basics"><label><span>Name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label><span>Role label</span><select value={role} onChange={(event) => setRole(event.target.value as CollaboratorRole)}><option value="co_dm">Co-DM</option><option value="dm">DM</option><option value="player">Player</option></select></label></div>

    <section className="access-capability-section"><div className="access-section-copy"><span>Campaign capabilities</span><small>Role is a label/package; these switches are the effective access.</small></div><div className="capability-chip-grid">{campaignCapabilities.map((capability) => <label className={capabilities.includes(capability.id) ? "active" : ""} key={capability.id}><input type="checkbox" checked={capabilities.includes(capability.id)} onChange={() => setCapabilities((current) => toggle(current, capability.id))} /><span>{capability.label}</span></label>)}</div></section>

    <section className="access-scope-section"><div className="access-section-copy"><span>World scope</span><small>Limit world capabilities without changing the role label.</small></div><div className="access-scope-controls"><select value={scopeKind} onChange={(event) => setScopeKind(event.target.value as "campaign" | "world_subgraph")}><option value="campaign">Whole campaign world</option><option value="world_subgraph">Selected world node</option></select>{scopeKind === "world_subgraph" ? <><select value={worldEntityId} onChange={(event) => setWorldEntityId(event.target.value)}>{data.worldEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select><label className="access-check"><input type="checkbox" checked={includeDescendants} onChange={(event) => setIncludeDescendants(event.target.checked)} />Include descendants when explicit containment exists</label></> : null}</div></section>

    <section className="access-table-section"><div className="access-section-copy"><span>Table access</span><small>Operational rights are separate from campaign/world rights.</small></div><div className="access-table-list">{tables.map((table) => {
      const tableMembership = tableMemberships.get(table.id) ?? null;
      return <TableAccessRow key={table.id} tableId={table.id} tableName={table.name} member={member} membership={tableMembership} busy={busy} run={run} />;
    })}</div></section>

    <section className="access-preview-section"><div className="access-section-copy"><span>Policy preview</span><small>Evaluate this member without impersonating them or executing an action.</small></div><div className="policy-preview-controls"><select value={previewCapability} onChange={(event) => setPreviewCapability(event.target.value as ProductCampaignCapability)}>{campaignCapabilities.map((capability) => <option key={capability.id} value={capability.id}>{capability.label}</option>)}</select>{previewCapability.startsWith("world.") ? <select value={previewEntityId} onChange={(event) => setPreviewEntityId(event.target.value)}><option value="">No world entity</option>{data.worldEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select> : null}<button type="button" disabled={busy} onClick={() => void testAccess()}>Test access</button>{preview ? <strong className={preview.allowed ? "allowed" : "denied"}>{preview.allowed ? "Allowed" : "Denied"} · {preview.reason.replaceAll("_", " ")}</strong> : null}</div></section>

    {feedback ? <p className="access-feedback">{feedback}</p> : null}
    <footer><button type="button" className="ghost-button" disabled={busy} onClick={() => void revokeCampaign()}>Revoke campaign access</button><button type="button" className="product-primary" disabled={busy || !displayName.trim()} onClick={() => void saveCampaign()}>Save access</button></footer>
  </article>;
}

function TableAccessRow({ tableId, tableName, member, membership, busy, run }: {
  tableId: string; tableName: string; member: ProductCampaignMembershipDto;
  membership: ProductSnapshotDto["tableMemberships"][number] | null; busy: boolean;
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  const initialRole = membership?.roleLabels.find((item): item is TableRole => item === "dm" || item === "co_dm" || item === "player") ?? "player";
  const [role, setRole] = useState<TableRole>(initialRole);
  const [capabilities, setCapabilities] = useState<ProductTableCapability[]>(membership?.capabilities ?? []);
  useEffect(() => { setCapabilities(membership?.capabilities ?? []); setRole(initialRole); }, [initialRole, membership]);

  const save = () => run(
    () => mutateProduct(`/tables/${tableId}/members/${encodeURIComponent(member.memberKey)}`, "PUT", membership
      ? { roleLabels: [role], capabilities }
      : { role }),
    membership ? `${tableName} access saved.` : `${tableName} access granted.`
  );
  const revoke = () => run(
    () => mutateProduct(`/tables/${tableId}/members/${encodeURIComponent(member.memberKey)}`, "DELETE"),
    `${tableName} access revoked.`
  );

  return <div className="access-table-row"><div><strong>{tableName}</strong><small>{membership ? "Explicit Table membership" : "No Table access"}</small></div><select value={role} onChange={(event) => setRole(event.target.value as TableRole)}><option value="co_dm">Co-DM</option><option value="dm">DM</option><option value="player">Player</option></select>{membership ? <div className="table-capability-chips">{tableCapabilities.map((capability) => <label className={capabilities.includes(capability.id) ? "active" : ""} key={capability.id}><input type="checkbox" checked={capabilities.includes(capability.id)} onChange={() => setCapabilities((current) => toggle(current, capability.id))} />{capability.label}</label>)}</div> : null}<div className="access-table-actions">{membership ? <button type="button" disabled={busy} onClick={() => void revoke()}>Revoke</button> : null}<button type="button" disabled={busy} onClick={() => void save()}>{membership ? "Save" : "Grant"}</button></div></div>;
}

export function CampaignAccessPanel({ data, campaign, onRefresh }: Props) {
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("co_dm");
  const [scopeKind, setScopeKind] = useState<"campaign" | "world_subgraph">("campaign");
  const [worldEntityId, setWorldEntityId] = useState(data.worldEntities[0]?.id ?? "");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canManage = campaign.capabilities.includes("campaign.members.manage");
  const members = data.campaignMemberships.filter((item) => item.campaignId === campaign.id);
  const editable = members.filter((item) => !item.systemManaged);
  const managed = members.filter((item) => item.systemManaged);

  const create = async () => {
    setBusy(true); setFeedback(null);
    try {
      await mutateProduct(`/campaigns/${campaign.id}/members`, "POST", {
        displayName, role, scopes: scopeFrom(scopeKind, worldEntityId, includeDescendants)
      });
      await onRefresh(); setDisplayName(""); setCreating(false); setFeedback("Collaborator added from the role preset. Fine-tune capabilities below.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to add collaborator"); }
    finally { setBusy(false); }
  };

  return <section className="campaign-access-panel">
    <header className="campaign-access-heading"><div><span className="product-kicker">Collaborators</span><h2>Shape access, not titles.</h2><p>Roles are presets and readable labels. Capabilities and scopes are what the policy engine actually evaluates.</p></div>{canManage ? <button className="product-secondary" type="button" onClick={() => setCreating((value) => !value)}>+ Collaborator</button> : null}</header>

    <div className="system-access-list">{managed.map((member) => <article key={member.id}><div><strong>{member.displayName}</strong><small>System-managed preview principal</small></div><span>{member.roleLabels.join(" · ")}</span><p>{member.capabilities.length} campaign capabilities · cannot be edited before auth</p></article>)}</div>

    {!canManage ? <div className="access-readonly-note">You can see your effective campaign access, but managing collaborators requires <code>campaign.members.manage</code>.</div> : null}

    {creating && canManage ? <section className="access-create-card"><div><span className="product-kicker">New collaborator</span><h3>Start from a role package.</h3><p>You can remove or add capabilities after creation.</p></div><label><span>Name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Collaborator name" /></label><label><span>Preset</span><select value={role} onChange={(event) => setRole(event.target.value as CollaboratorRole)}><option value="co_dm">Co-DM</option><option value="dm">DM</option><option value="player">Player</option></select></label><label><span>World scope</span><select value={scopeKind} onChange={(event) => setScopeKind(event.target.value as "campaign" | "world_subgraph")}><option value="campaign">Whole campaign world</option><option value="world_subgraph">Selected world node</option></select></label>{scopeKind === "world_subgraph" ? <><label><span>World node</span><select value={worldEntityId} onChange={(event) => setWorldEntityId(event.target.value)}>{data.worldEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label className="access-check"><input type="checkbox" checked={includeDescendants} onChange={(event) => setIncludeDescendants(event.target.checked)} />Include descendants when explicit containment exists</label></> : null}<div className="access-create-actions"><button type="button" className="ghost-button" onClick={() => setCreating(false)}>Cancel</button><button type="button" className="product-primary" disabled={busy || !displayName.trim() || (scopeKind === "world_subgraph" && !worldEntityId)} onClick={() => void create()}>Add collaborator</button></div></section> : null}

    {feedback ? <p className="access-feedback">{feedback}</p> : null}
    {editable.length ? <div className="campaign-access-list">{editable.map((member) => <CollaboratorCard key={member.id} data={data} campaign={campaign} member={member} onRefresh={onRefresh} />)}</div> : <div className="access-empty"><strong>No delegated collaborators yet.</strong><span>Owner access remains intact. Add a Co-DM when you want to delegate a slice of the campaign.</span></div>}
  </section>;
}
