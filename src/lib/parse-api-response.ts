/**
 * Fetch to /api/* sometimes returns HTML (login page, Next error page, Cloudflare error page).
 * Calling response.json() then throws "Unexpected token '<'".
 * Use this to parse API bodies and surface a clear error instead.
 */
function htmlErrorHint(httpStatus: number): string {
  if (httpStatus === 524) {
    return "Cloudflare timeout (524): the origin did not respond in time. Long video upload/analysis often hits this — bypass the tunnel for dev, increase origin/proxy timeouts, or move heavy work to a background job.";
  }
  if (httpStatus === 522) {
    return "Cloudflare could not reach your origin (522). Check that the server is running and the tunnel/host is correct.";
  }
  if (httpStatus === 504 || httpStatus === 408) {
    return "Gateway or request timeout — the operation took too long for the proxy/server.";
  }
  if (httpStatus === 502 || httpStatus === 503) {
    return "Bad gateway or service unavailable — origin may be down or overloaded.";
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return "Session may have expired or access denied — sign in again.";
  }
  if (httpStatus === 404) {
    return "API route was not found.";
  }
  return "Often: session expired (sign in again), or the API route crashed / was not found.";
}

export function parseJsonFromApiText<T = unknown>(text: string, httpStatus: number): T {
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("<!") ||
    (trimmed.startsWith("<") && /\bDOCTYPE\b/i.test(trimmed.slice(0, 200)))
  ) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${httpStatus}). ${htmlErrorHint(httpStatus)}`
    );
  }
  if (!trimmed) {
    throw new Error(`Empty response from server (HTTP ${httpStatus})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid JSON from server (HTTP ${httpStatus}): ${trimmed.slice(0, 180).replace(/\s+/g, " ")}`
    );
  }
}

export async function parseApiResponseJson<T = unknown>(res: Response): Promise<T> {
  return parseJsonFromApiText(await res.text(), res.status);
}

/** For error responses where we want a `{ message }` or `{}` without throwing on HTML. */
export async function parseApiErrorBody(res: Response): Promise<{ message?: string }> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!") || (trimmed.startsWith("<") && /\bDOCTYPE\b/i.test(trimmed.slice(0, 200)))) {
    return {
      message: `HTTP ${res.status}: ${htmlErrorHint(res.status)}`,
    };
  }
  try {
    const o = JSON.parse(text) as { message?: string };
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return { message: trimmed.slice(0, 200) || `HTTP ${res.status}` };
  }
}
