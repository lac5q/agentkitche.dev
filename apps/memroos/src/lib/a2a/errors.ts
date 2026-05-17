export type A2aErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "INTERNAL";

const STATUS_BY_CODE: Record<A2aErrorCode, number> = {
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  INTERNAL: 500,
};

export class A2aError extends Error {
  readonly code: A2aErrorCode;
  readonly details?: unknown;

  constructor(code: A2aErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "A2aError";
    this.code = code;
    this.details = details;
  }
}

export function a2aErrorResponse(error: A2aError): Response {
  return Response.json(
    {
      ok: false,
      error: error.message,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
    { status: STATUS_BY_CODE[error.code] }
  );
}
