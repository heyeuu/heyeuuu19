# Umami Pageviews Worker

This Worker exposes a small public endpoint for page-level Umami pageviews.

## Endpoint

`GET /api/pageviews?path=/blog/your-post`

Response example:

```json
{
  "pageviews": 128,
  "path": "/blog/your-post",
  "updatedAt": "2026-04-18T10:00:00.000Z"
}
```

The Worker merges `/blog/post` and `/blog/post/` so pageviews do not get split by trailing slash differences.

## Required secrets

Deploy the Worker with these secrets:

```bash
bunx wrangler secret put UMAMI_API_KEY
bunx wrangler secret put UMAMI_WEBSITE_ID
```

`UMAMI_WEBSITE_ID` is not sensitive, but keeping it in Wrangler secrets keeps setup simple.

## Optional variables

Set these in `wrangler.jsonc` or with `wrangler secret put` if you prefer:

- `UMAMI_API_ENDPOINT`: Defaults to `https://api.umami.is/v1`
- `CACHE_TTL_SECONDS`: Defaults to `300`
- `ALLOWED_ORIGIN`: Optional CORS origin. If omitted, the endpoint is public with `*`

## Deploy

From this directory:

```bash
bunx wrangler deploy
```

For local development:

```bash
bunx wrangler dev
```

Then set `PUBLIC_UMAMI_STATS_API_URL` in the Astro app to your deployed endpoint, for example:

```env
PUBLIC_UMAMI_STATS_API_URL="https://umami-pageviews.your-subdomain.workers.dev/api/pageviews"
```
