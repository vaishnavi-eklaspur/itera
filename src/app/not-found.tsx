import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <img
        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=900&fit=crop&auto=format&q=80"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center space-y-4 max-w-md">
        <p className="text-7xl font-display font-bold text-white/90">404</p>
        <h2 className="text-xl font-display font-semibold text-white">Lost in the backwaters</h2>
        <p className="text-sm text-white/70">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-forest-900 text-sm font-medium rounded-lg hover:bg-forest-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
