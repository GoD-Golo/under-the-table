export default function Features() {
  return (
    <section id="features" className="py-16 bg-gray-900">
      <h2 className="text-4xl font-bold text-center text-amber-500">
        Tailored Tools for Every Role
      </h2>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Player Features */}
        <div id="player-tools" className="bg-slate-700 p-8 rounded-lg">
          <h3 className="text-3xl font-semibold text-emerald-400">
            For Players
          </h3>
          <ul className="mt-4 space-y-2 text-gray-300">
            <li>
              🛡️ Character Creation: Build unique heroes with custom skills and
              abilities.
            </li>
            <li>
              📜 Manage Your Character Sheet: Track stats, equipment, and
              abilities with ease.
            </li>
            <li>
              📂 Archive Your Characters: Keep all your past and present
              characters in one place.
            </li>
          </ul>
        </div>

        {/* DM Features */}
        <div id="dm-tools" className="bg-slate-700 p-8 rounded-lg">
          <h3 className="text-3xl font-semibold text-rose-600">For DMs</h3>
          <ul className="mt-4 space-y-2 text-gray-300">
            <li>
              📖 Campaign Management: Organize notes, NPCs, and story arcs.
            </li>
            <li>
              👹 Monster & Encounter Management: Access and customize monster
              stat blocks for any encounter.
            </li>
            <li>
              🌍 Worldbuilding Tools: Keep your world’s lore and settings easily
              accessible.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );

  {
    /* See How It Works */
  }
  <section className="py-16 bg-gray-900">
    <h2 className="text-4xl font-bold text-center text-amber-500">
      See How It Works
    </h2>
    <div className="mt-12 flex justify-center">
      <div className="max-w-4xl">
        {/* <img
          src="/demo-image.jpg"
          alt="App demo"
          className="rounded-lg shadow-lg"
        /> */}
      </div>
    </div>
  </section>;
}
