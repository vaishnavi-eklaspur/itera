export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-stone-200 h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-2xl px-4">
          <div className="h-12 w-80 bg-stone-300 rounded mx-auto" />
          <div className="h-5 w-96 bg-stone-300/60 rounded mx-auto" />
          <div className="h-12 w-40 bg-stone-300 rounded-xl mx-auto" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8">
        <div className="h-8 w-56 bg-stone-200 rounded mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="h-48 bg-stone-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-stone-200 rounded" />
                <div className="h-3 w-full bg-stone-100 rounded" />
                <div className="h-6 w-20 bg-forest-100 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
