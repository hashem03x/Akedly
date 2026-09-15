// Base URL of the Akedly backend (server/). Overridable via
// NEXT_PUBLIC_API_URL; defaults to the backend's local dev port.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export class ApiRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      // The backend's auth cookie is httpOnly — this is required for the
      // browser to send/receive it on a cross-origin (different port)
      // request even in local dev.
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", "Could not reach the server");
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload || !payload.success) {
    throw new ApiRequestError(
      payload?.success === false ? payload.error.code : "UNKNOWN_ERROR",
      payload?.success === false ? payload.error.message : `Request failed with status ${response.status}`,
    );
  }

  return payload.data;
}
