import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#FFD700] mb-6">KMF LEDGER</h1>
        <p className="text-[#E5E4E2] text-xl mb-10">Kingdom Minded Financial Trading Journal</p>

        <Link
          href="/dashboard"
          className="gold-button px-10 py-4 text-xl rounded-2xl inline-block"
        >
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}