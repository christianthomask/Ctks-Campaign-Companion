"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
