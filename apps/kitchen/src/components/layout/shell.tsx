"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useHealth } from "@/lib/api-client";

export function Shell({ children }: { children: React.ReactNode }) {
  const { data } = useHealth();
  const services = data?.services || [];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar services={services} onMenuClick={() => setSidebarOpen(true)} />
      <main className="ak-workspace mt-14 box-border min-h-screen max-w-full overflow-x-hidden p-4 lg:ml-72 lg:p-6">{children}</main>
    </>
  );
}
