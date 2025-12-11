import Link from "next/link";

export default function NotFound() {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-center">
        <div className="p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800">Page Not Found</h2>
          <p className="mt-2 text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }
  