export default function Loading() {
  return (
    <div className="animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="h-8 w-32 rounded bg-gray-800 mb-2" />
        <div className="h-4 w-48 rounded bg-gray-800 mb-8" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-800/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
