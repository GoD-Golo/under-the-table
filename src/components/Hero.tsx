export default function Hero() {
  return (
    <section className="h-screen flex flex-col items-center justify-center text-center bg-slate-800">
      <h1 className="text-5xl font-bold text-amber-500">
        Tools for Every Hero and Storyteller
      </h1>
      <p className="mt-4 text-xl text-gray-300">
        Create characters, manage encounters, and keep your campaigns organized.
      </p>
      <div className="mt-8 space-x-4">
        <a href="#player-tools">
          <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-gray-100 font-semibold rounded-lg">
            Create Your Character
          </button>
        </a>
        <a href="#dm-tools">
          <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-gray-100 font-semibold rounded-lg">
            Organize Your Campaign
          </button>
        </a>
      </div>
    </section>
  );
}
