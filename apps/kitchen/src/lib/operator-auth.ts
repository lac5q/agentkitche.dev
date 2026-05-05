const OPERATOR_HEADER = "x-kitchen-operator-key";

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getRequestHostname(request: Request): string | null {
  try {
    return new URL(request.url).hostname;
  } catch {
    return null;
  }
}

function hasOperatorKey(request: Request, expectedKey: string): boolean {
  const headerKey = request.headers.get(OPERATOR_HEADER);
  const authorization = request.headers.get("authorization");
  const bearerKey = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  return headerKey === expectedKey || bearerKey === expectedKey;
}

export function authorizeRegistryWrite(request: Request): boolean {
  const operatorKey = process.env.KITCHEN_OPERATOR_API_KEY;
  if (operatorKey) {
    return hasOperatorKey(request, operatorKey);
  }

  const hostname = getRequestHostname(request);
  return Boolean(hostname && isLoopbackHost(hostname));
}

export function registryWriteUnauthorizedResponse(): Response {
  return Response.json(
    { ok: false, error: "Registry write authorization required" },
    { status: 403 }
  );
}
