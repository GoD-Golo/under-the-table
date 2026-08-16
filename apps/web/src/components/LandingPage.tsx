import { BrandLogo } from "./BrandLogo.js";

type LandingPageProps = {
  onEnterPlay: () => void;
  onEnterDirector: () => void;
};

const schools = [
  ["Abjuration", "◇"], ["Conjuration", "⌁"], ["Divination", "◉"], ["Enchantment", "✦"],
  ["Evocation", "△"], ["Illusion", "◌"], ["Necromancy", "✣"], ["Transmutation", "⬡"],
] as const;

function DeviceStage() {
  return (
    <div className="device-stage" aria-label="Under The Table across table, laptop, phone and tablet">
      <div className="device-orbit orbit-one" /><div className="device-orbit orbit-two" />
      <div className="device-node node-a" /><div className="device-node node-b" /><div className="device-node node-c" />

      <div className="hero-device hero-laptop">
        <div className="laptop-screen">
          <div className="mock-top"><span>Greyhaven</span><i>LIVE</i></div>
          <div className="mock-layout"><div className="mock-rail"><b /><b /><b /><b /></div><div className="mock-map"><span className="mock-pin p1" /><span className="mock-pin p2" /><span className="mock-token t1" /><span className="mock-token t2" /></div><div className="mock-panel"><em /><em /><em /></div></div>
        </div>
        <div className="laptop-base" />
      </div>

      <div className="hero-device hero-phone">
        <div className="device-speaker" />
        <div className="phone-ui"><small>COMPANION</small><strong>Mira Voss</strong><div className="phone-hp"><span /></div><div className="phone-row"><b>32 HP</b><b>AC 15</b></div><div className="phone-actions"><i /><i /><i /></div></div>
      </div>

      <div className="hero-device hero-tablet">
        <div className="tablet-ui"><small>LORE · GREYHAVEN</small><div className="tablet-art" /><strong>The First Light</strong><p>One world. One flow.</p><div className="tablet-lines"><i /><i /><i /></div></div>
      </div>

      <div className="hero-table-core">
        <BrandLogo compact />
        <span className="table-core-line" />
      </div>
      <div className="device-stage-caption"><span>One campaign</span><i /> <span>every surface</span></div>
    </div>
  );
}

export function LandingPage({ onEnterPlay, onEnterDirector }: LandingPageProps) {
  return (
    <main className="marketing-shell">
      <nav className="marketing-nav">
        <a className="marketing-logo" href="#top" aria-label="Under The Table home"><BrandLogo /></a>
        <div className="marketing-links"><a href="#platform">Platform</a><a href="#spellcraft">Spellcraft</a><a href="#play">How it plays</a></div>
        <button className="marketing-nav-cta" type="button" onClick={onEnterPlay}>Enter table <span>↗</span></button>
      </nav>

      <section className="marketing-hero" id="top">
        <div className="hero-copy">
          <span className="marketing-eyebrow"><i /> Built for the table, not around it</span>
          <h1>One table.<br /><em>Every screen.</em></h1>
          <p>Worldbuilding, live play and character tools that stay out of the way when the story starts moving.</p>
          <div className="hero-actions">
            <button className="marketing-primary" type="button" onClick={onEnterPlay}>Join the table <span>→</span></button>
            <button className="marketing-secondary" type="button" onClick={onEnterDirector}>Open Director</button>
          </div>
          <div className="hero-proof"><span className="proof-eye">◉</span><span><strong>One world, one flow.</strong> Prepare privately. Present deliberately. Play anywhere.</span></div>
        </div>
        <DeviceStage />
        <a className="hero-scroll" href="#platform"><span>Explore</span><i>↓</i></a>
      </section>

      <section className="platform-strip" id="platform">
        <article><span>01</span><div><h2>Build rich worlds</h2><p>Scenes, lore and connected places are different views of the same world.</p></div></article>
        <article><span>02</span><div><h2>Run the table</h2><p>Maps, tokens, initiative, checks and attacks stay synchronized live.</p></div></article>
        <article><span>03</span><div><h2>Play your way</h2><p>Virtual tabletop, physical companion or a hybrid table in the same session.</p></div></article>
      </section>

      <section className="ecosystem-section" id="play">
        <div className="section-heading"><span className="marketing-eyebrow"><i /> One ecosystem</span><h2>The interface follows the game.</h2><p>Not the other way around.</p></div>
        <div className="ecosystem-flow">
          <div className="flow-item"><span className="flow-icon laptop-icon" /><strong>Prepare</strong><small>Director</small></div><i className="flow-link" />
          <div className="flow-item"><span className="flow-icon phone-icon" /><strong>Companion</strong><small>At the table</small></div><i className="flow-link" />
          <div className="flow-item brand-flow"><BrandLogo compact /><strong>Play</strong><small>One session</small></div><i className="flow-link" />
          <div className="flow-item"><span className="flow-icon tablet-icon" /><strong>Present</strong><small>Shared view</small></div>
        </div>
      </section>

      <section className="spell-language" id="spellcraft">
        <div className="spell-copy"><span className="marketing-eyebrow"><i /> Spell language</span><h2>Readable at a glance.<br />Deep when you need it.</h2><p>A visual system organized first by base slot, then by school and action metadata — designed to scale into the full Action Engine later.</p><div className="slot-row"><span>C</span>{[1,2,3,4,5,6,7,8,9].map(level => <span key={level}>{level}</span>)}</div></div>
        <div className="spell-system-preview">
          <div className="school-grid">{schools.map(([name, icon]) => <div className={`school-chip school-${name.toLowerCase()}`} key={name}><span>{icon}</span><small>{name}</small></div>)}</div>
          <div className="spell-card-row">
            <article className="spell-preview-card"><header><span className="spell-glyph">✦</span><b>C</b></header><strong>Arcane spark</strong><small>Evocation · Action</small><div className="spell-tags"><i>60 ft</i><i>V S</i></div></article>
            <article className="spell-preview-card featured"><header><span className="spell-glyph">◇</span><b>1</b></header><strong>Protective ward</strong><small>Abjuration · Reaction</small><div className="spell-tags"><i>Self</i><i>V S</i></div></article>
            <article className="spell-preview-card"><header><span className="spell-glyph">⌁</span><b>2</b></header><strong>Veil step</strong><small>Conjuration · Bonus</small><div className="spell-tags"><i>Self</i><i>V</i></div></article>
          </div>
        </div>
      </section>

      <section className="marketing-cta">
        <BrandLogo compact />
        <div><span className="marketing-eyebrow">Ready when the table is.</span><h2>Your next session starts here.</h2></div>
        <div className="hero-actions"><button className="marketing-primary" type="button" onClick={onEnterPlay}>Enter Play <span>→</span></button><button className="marketing-secondary" type="button" onClick={onEnterDirector}>Build a world</button></div>
      </section>

      <footer className="marketing-footer"><BrandLogo /><span>Under The Table · private homelab preview</span><span>One world · one flow</span></footer>
    </main>
  );
}
