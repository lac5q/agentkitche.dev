import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });
const PUBLIC_LANDING_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);

function isPublicLandingHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return PUBLIC_LANDING_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

export const metadata: Metadata = {
  title: "MemroOS",
  description: "Agent memory OS for AI-native product, sales, and engineering workflows",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host") ?? "";
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#fbfbf8] text-slate-950`} suppressHydrationWarning>
        <Providers>
          <Shell publicLandingHost={isPublicLandingHost(host)}>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
