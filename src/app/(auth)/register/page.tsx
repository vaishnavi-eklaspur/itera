"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, confirmPassword: form.confirmPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Image panel */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=1200&fit=crop&auto=format&q=80"
          alt="Mountain landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-forest-950/40" />
        <div className="absolute bottom-10 left-10 right-10">
          <Link href="/" className="text-3xl font-display font-bold text-white">Itera</Link>
          <p className="mt-2 text-white/70 text-sm">Your South India journey starts here</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:text-left">
            <Link href="/" className="text-2xl font-display font-bold text-forest-700 lg:hidden">Itera</Link>
            <h1 className="text-xl font-display font-semibold text-stone-900 mt-4 lg:mt-0">Create account</h1>
            <p className="text-sm text-stone-500 mt-1">Sign up to track your enquiries and trips.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                placeholder="Repeat password"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-700 text-white py-3 rounded-lg font-medium hover:bg-forest-800 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-forest-600 hover:text-forest-700 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
