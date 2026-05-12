import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);

function isPublicLandingHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return PUBLIC_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

function isLandingAsset(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/")
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (!isPublicLandingHost(host) || isLandingAsset(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
