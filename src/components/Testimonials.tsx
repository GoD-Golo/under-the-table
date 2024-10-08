export default function Testimonials() {
  return (
    <section className="py-16 bg-slate-700">
      <h2 className="text-4xl font-bold text-center text-amber-500">
        Hear from Our Adventurers and Storytellers
      </h2>
      <div className="mt-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-xl italic">
            The best character creation tool I’ve used! My campaign has never
            been so organized.
          </p>
          <p className="mt-4 text-emerald-400">– A Veteran Adventurer</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-xl italic">
            As a DM, this app has been a lifesaver. The monster management
            system is incredible.
          </p>
          <p className="mt-4 text-rose-600">– A Masterful Storyteller</p>
        </div>
      </div>
    </section>
  );
}
