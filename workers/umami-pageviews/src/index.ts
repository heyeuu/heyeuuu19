const ALL_TIME_START_MS = Date.UTC(2000, 0, 1);
const DEFAULT_API_ENDPOINT = "https://api.umami.is/v1";
const DEFAULT_CACHE_TTL_SECONDS = 300;

interface Env {
  ALLOWED_ORIGIN?: string;
  CACHE_TTL_SECONDS?: string;
  UMAMI_API_ENDPOINT?: string;
  UMAMI_API_KEY?: string;
  UMAMI_WEBSITE_ID?: string;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface UmamiStatsResponse {
  pageviews?: number;
}

interface PageviewsResponse {
  pageviews: number;
  path: string;
  updatedAt: string;
}

type CloudflareCacheStorage = CacheStorage & {
  default: Cache;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContextLike,
  ): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "GET") {
      return json(
        { error: "Method not allowed." },
        405,
        withDefaultHeaders(corsHeaders),
      );
    }

    if (url.pathname === "/") {
      return json(
        {
          endpoints: ["GET /api/pageviews?path=/blog/your-post"],
          name: "umami-pageviews",
        },
        200,
        withDefaultHeaders(corsHeaders),
      );
    }

    if (url.pathname !== "/api/pageviews") {
      return json(
        { error: "Not found." },
        404,
        withDefaultHeaders(corsHeaders),
      );
    }

    const normalizedPath = normalizePath(url.searchParams.get("path"));

    if (!normalizedPath) {
      return json(
        { error: "A valid path query parameter is required." },
        400,
        withDefaultHeaders(corsHeaders),
      );
    }

    const apiKey = env.UMAMI_API_KEY;
    const websiteId = env.UMAMI_WEBSITE_ID;

    if (!apiKey || !websiteId) {
      return json(
        { error: "Worker is missing Umami credentials." },
        500,
        withDefaultHeaders(corsHeaders),
      );
    }

    const cacheKey = new Request(url.toString(), request);
    const cache = (caches as CloudflareCacheStorage).default;
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const endpoint = env.UMAMI_API_ENDPOINT ?? DEFAULT_API_ENDPOINT;
      const pageviews = await getPageviews({
        apiKey,
        endpoint,
        path: normalizedPath,
        websiteId,
      });

      const ttl = getCacheTtlSeconds(env.CACHE_TTL_SECONDS);
      const response = json(
        {
          pageviews,
          path: normalizedPath,
          updatedAt: new Date().toISOString(),
        } satisfies PageviewsResponse,
        200,
        withDefaultHeaders(corsHeaders, ttl),
      );

      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (error) {
      console.error("Failed to fetch Umami pageviews.", error);

      return json(
        { error: "Failed to fetch pageviews from Umami." },
        502,
        withDefaultHeaders(corsHeaders),
      );
    }
  },
};

async function getPageviews(input: {
  apiKey: string;
  endpoint: string;
  path: string;
  websiteId: string;
}): Promise<number> {
  const { apiKey, endpoint, path, websiteId } = input;
  const variants = getPathVariants(path);
  const responses = await Promise.all(
    variants.map((variant) =>
      fetchStats({
        apiKey,
        endpoint,
        path: variant,
        websiteId,
      }),
    ),
  );

  return responses.reduce((total, stats) => total + (stats.pageviews ?? 0), 0);
}

async function fetchStats(input: {
  apiKey: string;
  endpoint: string;
  path: string;
  websiteId: string;
}): Promise<UmamiStatsResponse> {
  const { apiKey, endpoint, path, websiteId } = input;
  const url = new URL(
    `websites/${websiteId}/stats`,
    ensureTrailingSlash(endpoint),
  );

  url.searchParams.set("startAt", String(ALL_TIME_START_MS));
  url.searchParams.set("endAt", String(Date.now()));
  url.searchParams.set("path", path);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-umami-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Umami request failed with ${response.status}: ${details || "No response body."}`,
    );
  }

  return (await response.json()) as UmamiStatsResponse;
}

function normalizePath(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }

  const trimmedInput = pathname.trim();

  if (!trimmedInput) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedInput);
    return normalizePath(parsedUrl.pathname);
  } catch {
    // `pathname` is already a path. Continue normalizing below.
  }

  if (!trimmedInput.startsWith("/")) {
    return null;
  }

  const pathWithoutQuery =
    trimmedInput.split("?")[0]?.split("#")[0] ?? trimmedInput;
  const trimmed = pathWithoutQuery.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "/") {
    return "/";
  }

  return trimmed.replace(/\/+$/, "");
}

function getPathVariants(pathname: string): string[] {
  if (pathname === "/") {
    return ["/"];
  }

  const variants = [pathname, `${pathname}/`];

  return Array.from(new Set(variants));
}

function getCorsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN ?? "*",
  };
}

function getCacheTtlSeconds(value: string | undefined): number {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}

function withDefaultHeaders(
  headers: HeadersInit,
  cacheTtlSeconds?: number,
): Headers {
  const resolvedHeaders = new Headers(headers);

  resolvedHeaders.set("Content-Type", "application/json; charset=utf-8");

  if (cacheTtlSeconds) {
    resolvedHeaders.set(
      "Cache-Control",
      `public, max-age=${cacheTtlSeconds}, s-maxage=${cacheTtlSeconds}, stale-while-revalidate=60`,
    );
  }

  return resolvedHeaders;
}

function json(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    headers,
    status,
  });
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
