# Umami Pageviews Worker

This Worker exposes a small public endpoint for page-level Umami pageviews.

## Endpoint

`GET /api/pageviews/blog/your-post`

Response example:

```json
{
  "pageviews": 128,
  "path": "/blog/your-post",
  "updatedAt": "2026-04-18T10:00:00.000Z"
}
```

The Worker only serves pageviews for routes under the allowed prefixes declared in `src/allowed-paths.generated.ts`, currently `/blog` and `/projects`. Requests outside those prefixes return `404`. It also merges `/blog/post` and `/blog/post/` so pageviews do not get split by trailing slash differences.

## Required secrets

Deploy the Worker with these secrets:

```bash
bunx wrangler secret put UMAMI_WEBSITE_ID
```

Then configure one authentication method:

- Umami Cloud: `bunx wrangler secret put UMAMI_API_KEY`
- Self-hosted Umami: `bunx wrangler secret put UMAMI_BEARER_TOKEN`

`UMAMI_WEBSITE_ID` is not sensitive, but keeping it in Wrangler secrets keeps setup simple.

## Optional variables

Set these in `wrangler.jsonc` or with `wrangler secret put` if you prefer:

- `UMAMI_API_ENDPOINT`: Defaults to `https://api.umami.is/v1`. For self-hosted Umami, set this to your instance API base such as `https://analytics.example.com/api`.
- `CACHE_TTL_SECONDS`: Defaults to `300`
- `ALLOWED_ORIGIN`: Optional CORS origin. If omitted, the endpoint is public with `*`

## Deploy

From the repo root, regenerate the allowed path prefixes before deploying the Worker if you changed that list:

```bash
bun run pageviews:sync
```

Then deploy from this directory:

```bash
bunx wrangler deploy
```

For local development:

```bash
bunx wrangler dev
```

Then set `PUBLIC_UMAMI_STATS_API_URL` in the Astro app to the pageviews API base URL. It can be an absolute URL or a site-relative path if the endpoint is served from the same origin. The blog post component will append the published page path automatically. For example:

```dotenv
PUBLIC_UMAMI_STATS_API_URL="https://umami-pageviews.your-subdomain.workers.dev/api/pageviews"
# Or, when the worker is routed through the same site origin:
PUBLIC_UMAMI_STATS_API_URL="/api/pageviews"
```
