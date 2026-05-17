"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Copy, Check } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UsersResponse {
  users: UserRecord[];
}

interface InviteResponse {
  inviteUrl: string;
}

type Role = "admin" | "operator" | "reviewer";

async function fetchUsers(): Promise<UsersResponse> {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json() as Promise<UsersResponse>;
}

async function createInvite(data: { role: Role; emailHint?: string }): Promise<InviteResponse> {
  const res = await fetch("/api/auth/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create invite");
  }
  return res.json() as Promise<InviteResponse>;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("reviewer");
  const [emailHint, setEmailHint] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-users"],
    queryFn: fetchUsers,
  });

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: (result) => {
      setInviteUrl(result.inviteUrl);
      setInviteError("");
      void queryClient.invalidateQueries({ queryKey: ["team-users"] });
    },
    onError: (err: Error) => {
      setInviteError(err.message);
    },
  });

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    inviteMutation.mutate({
      role: inviteRole,
      emailHint: emailHint.trim() || undefined,
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold text-zinc-100">Team</h1>
        </div>
        <button
          onClick={() => {
            setShowInviteForm(true);
            setInviteUrl(null);
            setEmailHint("");
            setInviteRole("reviewer");
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition"
        >
          <UserPlus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      {/* Invite form modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            {inviteUrl ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">Invite link generated</h2>
                <p className="text-sm text-zinc-400">
                  Share this link with the invitee. It expires in 72 hours and can only be used
                  once.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <span className="flex-1 truncate text-xs text-zinc-300">{inviteUrl}</span>
                  <button
                    onClick={() => void handleCopy()}
                    className="flex-shrink-0 text-zinc-400 hover:text-zinc-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteUrl(null);
                  }}
                  className="w-full rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">Invite team member</h2>
                <div>
                  <label className="block text-sm font-medium text-zinc-300" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300" htmlFor="emailHint">
                    Email hint (optional)
                  </label>
                  <input
                    id="emailHint"
                    type="email"
                    value={emailHint}
                    onChange={(e) => setEmailHint(e.target.value)}
                    placeholder="invitee@example.com"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? "Generating…" : "Generate invite link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="text-sm text-zinc-400">Loading team members…</div>
      ) : error ? (
        <div className="text-sm text-red-400">
          {error instanceof Error && error.message.includes("401")
            ? "Admin access required to view team members."
            : "Failed to load team members."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {data?.users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-100">{user.displayName}</td>
                  <td className="px-4 py-3 text-zinc-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-500/20 text-amber-300"
                          : user.role === "operator"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    No team members yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
