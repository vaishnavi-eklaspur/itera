export default function PackagesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="animate-pulse space-y-8">
        <div className="text-center space-y-2">
          <div className="h-9 w-64 bg-stone-200 rounded mx-auto" />
          <div className="h-4 w-96 bg-stone-100 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="h-48 bg-stone-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-stone-200 rounded" />
                <div className="h-3 w-full bg-stone-100 rounded" />
                <div className="h-3 w-2/3 bg-stone-100 rounded" />
                <div className="flex justify-between pt-2">
                  <div className="h-6 w-20 bg-forest-100 rounded" />
                  <div className="h-6 w-16 bg-stone-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
