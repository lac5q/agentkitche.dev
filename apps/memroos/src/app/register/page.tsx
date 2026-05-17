"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, inviteToken: inviteToken || undefined }),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      router.push("/login");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Memroos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {inviteToken ? "Accept your invitation" : "Create your account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <a href="/login" className="text-amber-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
