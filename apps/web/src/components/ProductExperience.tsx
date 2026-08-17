import { useMemo, useState, type ReactNode } from "react";
import { readDnd2024Data } from "@utt/rules-dnd2024";
import type { ProductCampaignDto, ProductCharacterDto, ProductSnapshotDto, ProductTableDto } from "@utt/protocol";
import { useProductSnapshot } from "../product.js";
import { BrandLogo } from "./BrandLogo.js";
import { CharacterLifecycleHome } from "./CharacterLifecycleHome.js";

export type ProductScreen = "home" | "campaigns" | "characters" | "campaign" | "table";

type PlaySurface = "table" | "companion";

interface ProductExperienceProps {
  screen: ProductScreen;
  campaignId?: string | undefined;
  tableId?: string | undefined;
  onLanding: () => void;
  onHome: () => void;
  onCampaigns: () => void;
  onCharacters: () => void;
  onCampaign: (campaignId: string) => void;
  onTable: (tableId: string) => void;
  onWorld: (campaignId: string, tableId?: string) => void;
  onPlay: (tableId: string, surface: PlaySurface, characterId: string | null) => void;
}

function roleLabel(role: string): string {
  if (role === "co_dm") return "Co-DM";
  return role.slice(0, 1).toUpperCase() + role.slice(1);
}
function CharacterMeta({ character }: { character: ProductCharacterDto }) {
  const data = character.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  return <>
    <span>{data ? `Level ${data.level} ${data.classId}` : character.rulesetId}</span>
    <small>{character.hp ? `${character.hp.current} / ${character.hp.max} HP` : "No HP resource"}</small>
  </>;
}

function RoleBadges({ roles }: { roles: string[] }) {
  return <div className="product-role-badges">{roles.map((role) => <span key={role}>{roleLabel(role)}</span>)}</div>;
}

function ProductChrome({ screen, onLanding, onHome, onCampaigns, onCharacters, children }: {
  screen: ProductScreen;
  onLanding: () => void;
  onHome: () => void;
  onCampaigns: () => void;
  onCharacters: () => void;
  children: ReactNode;
}) {
  return <main className="product-shell">
    <header className="product-nav">
      <button className="product-brand" type="button" onClick={onHome} aria-label="Under The Table Home"><BrandLogo /></button>
      <nav aria-label="Product navigation">
        <button className={screen === "home" ? "active" : ""} type="button" onClick={onHome}>Home</button>
        <button className={screen === "campaigns" || screen === "campaign" || screen === "table" ? "active" : ""} type="button" onClick={onCampaigns}>Campaigns</button>
        <button className={screen === "characters" ? "active" : ""} type="button" onClick={onCharacters}>Characters</button>
      </nav>
      <button className="product-exit" type="button" onClick={onLanding}>Showcase</button>
    </header>
    <div className="product-content">{children}</div>
  </main>;
}
function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <section className="product-empty"><span className="product-kicker">Under The Table</span><h1>{title}</h1><p>{copy}</p></section>;
}

function ContinueTable({ table, campaign, character, onTable, onPlay }: {
  table: ProductTableDto;
  campaign: ProductCampaignDto;
  character: ProductCharacterDto | null;
  onTable: (id: string) => void;
  onPlay: (tableId: string, surface: PlaySurface, characterId: string | null) => void;
}) {
  return <section className="product-continue">
    <div className="product-continue-copy">
      <span className="product-kicker">Continue</span>
      <h1>{campaign.name}</h1>
      <p>{table.name}{table.activeSceneName ? ` · ${table.activeSceneName}` : ""}</p>
      <RoleBadges roles={table.roleLabels} />
      {character ? <div className="product-playing-as"><span>Playing as</span><strong>{character.name}</strong></div> : null}
    </div>
    <div className="product-continue-actions">
      <button className="product-primary" type="button" onClick={() => onPlay(table.id, "table", character?.id ?? null)}>Continue session <span>→</span></button>
      <button className="product-secondary" type="button" onClick={() => onTable(table.id)}>Open table</button>
    </div>
  </section>;
}
function HomePage({ data, onCampaign, onCampaigns, onCharacters, onTable, onPlay }: {
  data: ProductSnapshotDto;
  onCampaign: (id: string) => void;
  onCampaigns: () => void;
  onCharacters: () => void;
  onTable: (id: string) => void;
  onPlay: ProductExperienceProps["onPlay"];
}) {
  const table = data.tables.find((item) => item.currentSessionId) ?? data.tables[0] ?? null;
  const campaign = table ? data.campaigns.find((item) => item.id === table.campaignId) ?? null : null;
  const character = table ? data.characters.find((item) => item.tableIds.includes(table.id)) ?? null : null;

  return <>
    <section className="product-page-heading"><span className="product-kicker">Home</span><h1>Welcome back.</h1><p>Pick up the table, world, or character you actually need.</p></section>
    {table && campaign ? <ContinueTable table={table} campaign={campaign} character={character} onTable={onTable} onPlay={onPlay} /> : null}

    <section className="product-section">
      <header><div><span className="product-kicker">Campaigns</span><h2>Your worlds</h2></div><button type="button" onClick={onCampaigns}>View all</button></header>
      <div className="campaign-card-grid">{data.campaigns.map((item) => <button className="campaign-card" type="button" key={item.id} onClick={() => onCampaign(item.id)}>
        <div className="campaign-card-art"><span>◉</span></div><div className="campaign-card-copy"><RoleBadges roles={item.roleLabels} /><strong>{item.name}</strong><p>{item.summary}</p><small>{item.tableCount} table · {item.characterCount} character</small></div>
      </button>)}</div>
    </section>

    <section className="product-home-split">
      <div className="product-section compact"><header><div><span className="product-kicker">Characters</span><h2>Recent characters</h2></div><button type="button" onClick={onCharacters}>Open</button></header><div className="character-home-list">{data.characters.slice(0, 4).map((item) => <article key={`${item.campaignId}:${item.id}`}><div className="character-avatar">{item.name.slice(0,1)}</div><div><strong>{item.name}</strong><CharacterMeta character={item} /></div></article>)}</div></div>
      <div className="product-section compact"><header><div><span className="product-kicker">Activity</span><h2>At the tables</h2></div></header><div className="product-activity">{data.activity.slice(0, 5).map((item) => <article key={`${item.tableId}:${item.sequence}`}><span>#{item.sequence}</span><p>{item.summary}</p></article>)}</div></div>
    </section>
  </>;
}
function CampaignsPage({ data, onCampaign }: { data: ProductSnapshotDto; onCampaign: (id: string) => void }) {
  return <>
    <section className="product-page-heading"><span className="product-kicker">Campaigns</span><h1>Your campaigns.</h1><p>Shared worlds can hold one table or many tables with different rosters.</p></section>
    <div className="campaign-card-grid wide">{data.campaigns.map((campaign) => <button className="campaign-card large" type="button" key={campaign.id} onClick={() => onCampaign(campaign.id)}>
      <div className="campaign-card-art"><span>◉</span></div>
      <div className="campaign-card-copy"><RoleBadges roles={campaign.roleLabels} /><strong>{campaign.name}</strong><p>{campaign.summary}</p><small>{campaign.tableCount} table · {campaign.characterCount} character</small></div>
      <span className="campaign-card-arrow">→</span>
    </button>)}</div>
  </>;
}

function CampaignHomePage({ data, campaign, onTable, onCharacters, onWorld }: {
  data: ProductSnapshotDto;
  campaign: ProductCampaignDto;
  onTable: (id: string) => void;
  onCharacters: () => void;
  onWorld: (campaignId: string, tableId?: string) => void;
}) {
  const tables = data.tables.filter((item) => item.campaignId === campaign.id);
  const characters = data.characters.filter((item) => item.campaignId === campaign.id);
  const primaryTable = tables.find((item) => item.currentSessionId) ?? tables[0] ?? null;
  return <>
    <section className="campaign-hero"><div><span className="product-kicker">Campaign</span><h1>{campaign.name}</h1><p>{campaign.summary}</p><RoleBadges roles={campaign.roleLabels} /></div>{primaryTable ? <button className="product-primary" type="button" onClick={() => onTable(primaryTable.id)}>Continue <span>→</span></button> : null}</section>
    <div className="campaign-home-grid">
      <section className="product-section campaign-tables"><header><div><span className="product-kicker">Tables</span><h2>Play groups</h2></div></header><div className="table-list">{tables.map((table) => <button key={table.id} type="button" onClick={() => onTable(table.id)}><div><strong>{table.name}</strong><span>{table.activeSceneName ?? "No active scene"}</span></div><RoleBadges roles={table.roleLabels} /><small>{table.characterIds.length} character{table.characterIds.length === 1 ? "" : "s"}</small><b>→</b></button>)}</div></section>
      <section className="campaign-world-card"><span className="product-kicker">Shared world</span><h2>World & Director</h2><p>Scenes, lore and the World Graph belong to the campaign. Prepare privately, then present to a table.</p><button className="product-secondary" type="button" onClick={() => onWorld(campaign.id, primaryTable?.id)}>Open world</button></section>
    </div>
    <section className="product-home-split campaign-lower">
      <div className="product-section compact"><header><div><span className="product-kicker">Characters</span><h2>Campaign roster</h2></div><button type="button" onClick={onCharacters}>Characters Home</button></header><div className="character-home-list">{characters.map((character) => <article key={character.id}><div className="character-avatar">{character.name.slice(0,1)}</div><div><strong>{character.name}</strong><CharacterMeta character={character} /></div></article>)}</div></div>
      <div className="product-section compact"><header><div><span className="product-kicker">Activity</span><h2>Recent changes</h2></div></header><div className="product-activity">{data.activity.filter((event) => tables.some((table) => table.id === event.tableId)).slice(0, 6).map((event) => <article key={`${event.tableId}:${event.sequence}`}><span>#{event.sequence}</span><p>{event.summary}</p></article>)}</div></div>
    </section>
  </>;
}

function TableHomePage({ data, table, campaign, onCampaign, onWorld, onPlay }: {
  data: ProductSnapshotDto;
  table: ProductTableDto;
  campaign: ProductCampaignDto;
  onCampaign: (id: string) => void;
  onWorld: (campaignId: string, tableId?: string) => void;
  onPlay: ProductExperienceProps["onPlay"];
}) {
  const characters = data.characters.filter((character) => table.characterIds.includes(character.id));
  const storedCharacter = window.localStorage.getItem("utt.play.character.v1");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() => characters.some((item) => item.id === storedCharacter) ? storedCharacter : characters[0]?.id ?? null);
  const selected = characters.find((item) => item.id === selectedCharacterId) ?? characters[0] ?? null;
  const canPrepare = table.roleLabels.includes("dm") || table.roleLabels.includes("co_dm");
  const selectCharacter = (id: string) => { setSelectedCharacterId(id); window.localStorage.setItem("utt.play.character.v1", id); };

  return <>
    <button className="product-breadcrumb" type="button" onClick={() => onCampaign(campaign.id)}>← {campaign.name}</button>
    <section className="table-home-hero">
      <div><span className="product-kicker">Table</span><h1>{table.name}</h1><p>{table.summary}</p><RoleBadges roles={table.roleLabels} /></div>
      <div className="table-scene-status"><span>On table</span><strong>{table.activeSceneName ?? "No active scene"}</strong><small>{table.currentSessionId ? "Session ready" : "No active session"}</small></div>
    </section>

    <section className="table-entry-grid">
      <div className="table-character-choice"><span className="product-kicker">Who are you playing?</span><h2>{selected?.name ?? "Choose a character"}</h2><div className="table-character-list">{characters.map((character) => <button className={character.id === selected?.id ? "active" : ""} type="button" key={character.id} onClick={() => selectCharacter(character.id)}><div className="character-avatar">{character.name.slice(0,1)}</div><div><strong>{character.name}</strong><CharacterMeta character={character} /></div><span className="choice-check">{character.id === selected?.id ? "✓" : ""}</span></button>)}</div></div>
      <div className="table-play-choice"><span className="product-kicker">How are you playing?</span><button className="play-choice primary" type="button" disabled={!table.currentSessionId} onClick={() => onPlay(table.id, "table", selected?.id ?? null)}><span className="play-choice-icon">▱</span><div><strong>Virtual Table</strong><small>Map-first · tokens · HUD</small></div><b>→</b></button><button className="play-choice" type="button" onClick={() => onPlay(table.id, "companion", selected?.id ?? null)}><span className="play-choice-icon">▯</span><div><strong>Physical Companion</strong><small>Character · checks · actions</small></div><b>→</b></button>{canPrepare ? <button className="prepare-choice" type="button" onClick={() => onWorld(campaign.id, table.id)}><span>DM / Co-DM</span><strong>Prepare this table</strong><small>Open Director without changing what players see.</small></button> : null}</div>
    </section>
  </>;
}
export function ProductExperience(props: ProductExperienceProps) {
  const product = useProductSnapshot();
  const campaign = useMemo(() => product.data?.campaigns.find((item) => item.id === props.campaignId) ?? null, [product.data, props.campaignId]);
  const table = useMemo(() => product.data?.tables.find((item) => item.id === props.tableId) ?? null, [product.data, props.tableId]);

  let content: ReactNode;
  if (product.loading && !product.data) content = <EmptyState title="Opening Home…" copy="Loading your campaigns, tables and characters." />;
  else if (product.error && !product.data) content = <section className="product-empty"><span className="product-kicker">Home unavailable</span><h1>Couldn’t load the product context.</h1><p>{product.error}</p><button className="product-secondary" type="button" onClick={() => void product.refresh()}>Try again</button></section>;
  else if (!product.data) content = <EmptyState title="Nothing here yet." copy="The product snapshot is empty." />;
  else if (props.screen === "home") content = <HomePage data={product.data} onCampaign={props.onCampaign} onCampaigns={props.onCampaigns} onCharacters={props.onCharacters} onTable={props.onTable} onPlay={props.onPlay} />;
  else if (props.screen === "campaigns") content = <CampaignsPage data={product.data} onCampaign={props.onCampaign} />;
  else if (props.screen === "characters") content = <CharacterLifecycleHome data={product.data} onTable={props.onTable} onRefresh={product.refresh} />;
  else if (props.screen === "campaign" && campaign) content = <CampaignHomePage data={product.data} campaign={campaign} onTable={props.onTable} onCharacters={props.onCharacters} onWorld={props.onWorld} />;
  else if (props.screen === "table" && table) {
    const parent = product.data.campaigns.find((item) => item.id === table.campaignId) ?? null;
    content = parent ? <TableHomePage data={product.data} table={table} campaign={parent} onCampaign={props.onCampaign} onWorld={props.onWorld} onPlay={props.onPlay} /> : <EmptyState title="Campaign unavailable." copy="This table has no visible campaign context." />;
  } else content = <EmptyState title="Not found." copy="That product destination is not available in this preview." />;

  return <ProductChrome screen={props.screen} onLanding={props.onLanding} onHome={props.onHome} onCampaigns={props.onCampaigns} onCharacters={props.onCharacters}>{content}</ProductChrome>;
}
