"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="flex h-screen items-center justify-center bg-gray-50 text-center">
        <div className="p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-700">{error.message}</p>
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
