export default function Loading() {
  return (
    <div className="animate-pulse px-4 py-6">
      <div className="h-6 w-48 rounded bg-gray-800 mb-4" />
      <div className="h-4 w-32 rounded bg-gray-800 mb-8" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
