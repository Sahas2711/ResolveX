// =============================================================================
// Standardized API Response Helpers
// Consistent envelope: { success, data?, error?, meta? }
// =============================================================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Success Responses ──────────────────────────────────────────────────────

export function successResponse<T>(data: T, meta?: PaginationMeta): Response {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;

  return Response.json(body, { status: 200 });
}

export function createdResponse<T>(data: T): Response {
  return Response.json({ success: true, data } satisfies ApiSuccessResponse<T>, {
    status: 201,
  });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

// ── Error Responses ────────────────────────────────────────────────────────

export function badRequestResponse(message: string, details?: ValidationErrorDetail[]): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "BAD_REQUEST", message, details },
  };
  return Response.json(body, { status: 400 });
}

export function unauthorizedResponse(message = "Authentication failed"): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "UNAUTHORIZED", message },
  };
  return Response.json(body, { status: 401 });
}

export function forbiddenResponse(message = "Insufficient permissions"): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "FORBIDDEN", message },
  };
  return Response.json(body, { status: 403 });
}

export function notFoundResponse(message = "Resource not found"): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "NOT_FOUND", message },
  };
  return Response.json(body, { status: 404 });
}

export function conflictResponse(message: string): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "CONFLICT", message },
  };
  return Response.json(body, { status: 409 });
}

export function validationErrorResponse(details: ValidationErrorDetail[]): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details,
    },
  };
  return Response.json(body, { status: 422 });
}

export function internalErrorResponse(message = "Internal server error"): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: "INTERNAL_ERROR", message },
  };
  return Response.json(body, { status: 500 });
}
