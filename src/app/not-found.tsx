import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-bold text-teal-600">404</p>
        <h2 className="text-xl font-semibold text-slate-900">Page not found</h2>
        <p className="text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
