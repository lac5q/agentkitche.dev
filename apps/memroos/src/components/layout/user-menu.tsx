"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserInfo | null) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    // Clear local access_token cookie
    document.cookie = "access_token=; SameSite=Lax; Path=/; Max-Age=0";
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400">
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-zinc-200">{user.displayName || user.email}</p>
        <p className="truncate capitalize text-zinc-500">{user.role}</p>
      </div>
      <button
        onClick={handleLogout}
        className="shrink-0 rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
