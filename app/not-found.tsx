import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-100">404 - Page Not Found</h2>
      <p className="text-sm text-slate-400">The requested page could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
