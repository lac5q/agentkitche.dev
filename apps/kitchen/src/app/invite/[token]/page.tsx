"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

interface InviteInfo {
  role: string;
  emailHint?: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function validateInvite() {
      try {
        const res = await fetch(`/api/auth/invite/${token}`);
        if (!res.ok) {
          setInvalid(true);
          return;
        }
        const data = (await res.json()) as InviteInfo;
        setInviteInfo(data);
        if (data.emailHint) setEmail(data.emailHint);
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    }
    void validateInvite();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, inviteToken: token }),
      });
      if (res.status === 409) {
        setError("This email is already registered.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Registration failed.");
        return;
      }
      router.push("/login?message=account-created");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Validating invitation…</p>
      </div>
    );
  }

  if (invalid || !inviteInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-100">Invitation Invalid</h1>
          <p className="text-sm text-zinc-400">
            This invitation link is invalid, expired, or has already been used.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Join Memoroos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            You&apos;ve been invited as <span className="font-medium text-amber-400">{inviteInfo.role}</span>.
            Set up your account below.
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
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300" htmlFor="displayName">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
