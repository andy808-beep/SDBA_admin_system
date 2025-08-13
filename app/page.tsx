import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">StanleyDB</h1>
      <p className="mt-4">
        Go to <Link className="text-blue-600 underline" href="/auth">Auth</Link>
      </p>
    </main>
  );
}