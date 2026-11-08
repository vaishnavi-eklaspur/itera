"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await Promise.race([
        signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Login timed out")), 15_000)
        ),
      ]);

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        window.location.assign("/admin");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Login timed out"
          ? "Login is taking too long. Please try again."
          : "Unable to sign in. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Image panel — hidden on mobile */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=900&h=1200&fit=crop&auto=format&q=80"
          alt="Kerala backwaters"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-forest-950/40" />
        <div className="absolute bottom-10 left-10 right-10">
          <Link href="/" className="text-3xl font-display font-bold text-white">Itera</Link>
          <p className="mt-2 text-white/70 text-sm">Handcrafted South India travel</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:text-left">
            <Link href="/" className="text-2xl font-display font-bold text-forest-700 lg:hidden">Itera</Link>
            <h1 className="text-xl font-display font-semibold text-stone-900 mt-4 lg:mt-0">Sign in</h1>
            <p className="text-sm text-stone-500 mt-1">Welcome back. Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                placeholder="admin@itera.in"
              />
            </div>
            <div>
              <label className="text-sm text-stone-700 font-medium block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-700 text-white py-3 rounded-lg font-medium hover:bg-forest-800 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-forest-600 hover:text-forest-700 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
