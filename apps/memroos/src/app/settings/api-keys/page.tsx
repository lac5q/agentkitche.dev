"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Copy, Check, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeysResponse {
  apiKeys: ApiKey[];
}

interface NewKeyResponse {
  id: string;
  keyRaw: string;
  label: string;
  createdAt: string;
}

interface MeResponse {
  id: string;
  email: string;
  displayName: string;
}

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json() as Promise<MeResponse>;
}

async function fetchApiKeys(userId: string): Promise<ApiKeysResponse> {
  const res = await fetch(`/api/users/${userId}/api-keys`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch API keys");
  return res.json() as Promise<ApiKeysResponse>;
}

async function createApiKey(
  userId: string,
  label: string
): Promise<NewKeyResponse> {
  const res = await fetch(`/api/users/${userId}/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to generate key");
  }
  return res.json() as Promise<NewKeyResponse>;
}

async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const res = await fetch(`/api/users/${userId}/api-keys/${keyId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to revoke key");
  }
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState("");

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const userId = meData?.id ?? "";

  const { data: keysData, isLoading } = useQuery({
    queryKey: ["api-keys", userId],
    queryFn: () => fetchApiKeys(userId),
    enabled: Boolean(userId),
  });

  const createMutation = useMutation({
    mutationFn: ({ label }: { label: string }) => createApiKey(userId, label),
    onSuccess: (result) => {
      setNewKeyRaw(result.keyRaw);
      setNewLabel("");
      setGenError("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });
    },
    onError: (err: Error) => {
      setGenError(err.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => revokeApiKey(userId, keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });
    },
  });

  async function handleCopy() {
    if (!newKeyRaw) return;
    await navigator.clipboard.writeText(newKeyRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold text-zinc-100">API Keys</h1>
        </div>
        <button
          onClick={() => {
            setShowNewKeyForm(true);
            setNewKeyRaw(null);
            setNewLabel("");
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition"
        >
          <Plus className="h-4 w-4" />
          Generate key
        </button>
      </div>

      <p className="text-sm text-zinc-400">
        API keys let you authenticate programmatically with Bearer tokens. Keys are shown only
        once — store them securely.
      </p>

      {/* New key form modal */}
      {showNewKeyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            {newKeyRaw ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">API key generated</h2>
                <p className="text-sm text-red-400">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <span className="flex-1 truncate text-xs font-mono text-zinc-300">
                    {newKeyRaw}
                  </span>
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
                    setShowNewKeyForm(false);
                    setNewKeyRaw(null);
                  }}
                  className="w-full rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({ label: newLabel });
                }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-zinc-100">New API key</h2>
                <div>
                  <label
                    className="block text-sm font-medium text-zinc-300"
                    htmlFor="keyLabel"
                  >
                    Label (optional)
                  </label>
                  <input
                    id="keyLabel"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. CI/CD pipeline"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                {genError && <p className="text-sm text-red-400">{genError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewKeyForm(false)}
                    className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {createMutation.isPending ? "Generating…" : "Generate"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="text-sm text-zinc-400">Loading API keys…</div>
      ) : (
        <div className="space-y-2">
          {keysData?.apiKeys.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
              No API keys yet. Generate one to get started.
            </div>
          ) : (
            keysData?.apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-zinc-100">
                    {key.label || <span className="text-zinc-500 italic">Unlabeled</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt &&
                      ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  title="Revoke key"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
