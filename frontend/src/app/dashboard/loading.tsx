export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 h-28">
            <div className="h-2.5 w-16 bg-surface-3 rounded mb-4" />
            <div className="h-8 w-20 bg-surface-3 rounded mb-2" />
            <div className="h-2 w-24 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 card h-72" />
        <div className="lg:col-span-2 card h-72" />
      </div>
    </div>
  );
}
