export default function Pricing() {
  return (
    <section className="py-16 bg-gray-900">
      <h2 className="text-4xl font-bold text-center text-amber-500">
        Choose Your Path
      </h2>
      <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-700 p-8 rounded-lg">
          <h3 className="text-3xl font-semibold text-emerald-400">
            For Players
          </h3>
          <p className="mt-4 text-gray-300">
            Create and manage your characters with our free tools.
          </p>
          <button className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-gray-100 font-semibold rounded-lg">
            Get Started for Free
          </button>
        </div>
        <div className="bg-slate-700 p-8 rounded-lg">
          <h3 className="text-3xl font-semibold text-rose-600">For DMs</h3>
          <p className="mt-4 text-gray-300">
            Unlock advanced campaign management tools with our Pro plan.
          </p>
          <button className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-gray-100 font-semibold rounded-lg">
            Get Started for Free
          </button>
        </div>
      </div>
    </section>
  );
}
