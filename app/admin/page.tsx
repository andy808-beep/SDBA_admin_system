'use client';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2">You’re signed in as an admin.</p>
      <button className="mt-6 bg-slate-900 text-white px-4 py-2 rounded"
        onClick={async () => { await supabase.auth.signOut(); router.push('/auth'); }}>
        Log out
      </button>
    </main>
  );
}
