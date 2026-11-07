export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-stone-200 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
            <div className="h-5 w-5 bg-stone-200 rounded" />
            <div className="h-8 w-16 bg-stone-200 rounded" />
            <div className="h-3 w-24 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="h-5 w-36 bg-stone-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 bg-stone-100 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-40 bg-stone-200 rounded" />
              <div className="h-3 w-56 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
