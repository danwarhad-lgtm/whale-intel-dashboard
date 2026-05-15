/**
 * safeFetch — fetch wrapper with timeout, retries and structured error reporting.
 *
 * @template T
 * @param {string} url
 * @param {{timeoutMs?: number, retries?: number, headers?: Record<string,string>, init?: RequestInit}} [opts]
 * @returns {Promise<{ok: boolean, data: T|null, error: string|null, status: number, latencyMs: number}>}
 */
export async function safeFetch(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retries = opts.retries ?? 1;
  const parseJson = opts.parseJson !== false;
  const start = Date.now();

  let lastError = null;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...opts.init,
        method: opts.method ?? opts.init?.method ?? "GET",
        body: opts.body ?? opts.init?.body,
        signal: controller.signal,
        headers: {
          Accept: parseJson ? "application/json" : "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent": "whale-intel-poly/0.1",
          ...(opts.headers ?? {}),
        },
        cache: "no-store",
      });

      clearTimeout(timer);
      lastStatus = res.status;

      if (!res.ok) {
        lastError = `HTTP ${res.status} ${res.statusText}`;
        if (res.status >= 500 && attempt < retries) continue;
        return {
          ok: false,
          data: null,
          error: lastError,
          status: res.status,
          latencyMs: Date.now() - start,
        };
      }

      const data = parseJson ? await res.json() : await res.text();
      return {
        ok: true,
        data,
        error: null,
        status: res.status,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error) {
        lastError =
          err.name === "AbortError"
            ? `Timeout after ${timeoutMs}ms`
            : err.message;
      } else {
        lastError = "unknown error";
      }
      if (attempt < retries) continue;
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError ?? "fetch failed",
    status: lastStatus,
    latencyMs: Date.now() - start,
  };
}
