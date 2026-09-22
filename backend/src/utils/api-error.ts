export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = "Authentication required.", code = "UNAUTHORIZED") {
    return new ApiError(401, code, message);
  }
  static forbidden(message = "You do not have access to this resource.", code = "FORBIDDEN") {
    return new ApiError(403, code, message);
  }
  static notFound(message = "Resource not found.", code = "NOT_FOUND") {
    return new ApiError(404, code, message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  static internal(message = "Something went wrong.", code = "INTERNAL_ERROR") {
    return new ApiError(500, code, message);
  }
}
