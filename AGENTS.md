# Repository Guidelines

## Stack Snapshot

- App type: static Astro portfolio/blog built with content collections and Tailwind CSS v4.
- Package manager: Bun. The repo does not pin a `packageManager` field in `package.json`; local environment currently has `bun 1.3.10`.
- Declared direct dependencies in `package.json`:
  - `astro@^6.0.4`
  - `tailwindcss@^4.2.1`
  - `@tailwindcss/vite@^4.2.1`
  - `@tailwindcss/typography@^0.5.19`
  - `@astrojs/sitemap@^3.7.1`
- Current `bun.lock` resolutions:
  - `astro@6.0.7`
  - `tailwindcss@4.2.2`
  - `@tailwindcss/vite@4.2.2`
  - `@tailwindcss/typography@0.5.19`
  - `@astrojs/sitemap@3.7.1`
- Registry: `.bunconfig.toml` points Bun installs at `https://registry.npmmirror.com`.
- Relevant transitive dependencies present in the lockfile: `shiki@4.0.2` and optional `sharp@0.34.5`. There is no `mako` dependency.
- There are no React, Svelte, or MDX integrations configured. The current app is `.astro` pages/components plus Markdown content.
- There is no unit test runner, no ESLint config, and no Tailwind config file.

## Project Map

- `src/pages/`
  - Static routes: `index.astro`, `about.astro`, `contact.astro`, `404.astro`
  - Blog routes: `blog/index.astro`, `blog/[...id].astro`
  - Project routes: `projects/index.astro`, `projects/[...id].astro`
- `src/components/`
  - Shared UI: `Head.astro`, `Header.astro`, `Footer.astro`, `Card.astro`, `FormattedDate.astro`
  - Home/about/contact sections: `Hero.astro`, `About.astro`, `Projects.astro`, `Posts.astro`, `Contact.astro`
- `src/layouts/Layout.astro`: the single shared layout. It wraps every page with `Head`, `Header`, `Footer`, and imports `src/styles/global.css`.
- `src/content/`
  - `blog/*.md`
  - `projects/*.md`
- `src/content.config.ts`: collection schemas and loaders.
- `src/consts.ts`: site metadata, page metadata, social links, and copy used by `astro.config.mjs`.
- `src/styles/global.css`: Tailwind v4 entrypoint, typography plugin registration, and theme tokens.
- `public/`: active static assets used by the site, including `favicon.svg`, `portrait.webp`, and project thumbnails.
- `src/assets/`: currently contains `astro.svg` and `background.svg`, but those files are not used by the rendered site.
- Generated directories: `dist/`, `.astro/`, and `node_modules/` are build/install artifacts and should not be edited manually.
- There is no `src/hooks/`, `src/lib/`, or `src/utils/` directory in the current implementation.

## Content Collections

`src/content.config.ts` defines exactly two collections:

- `blog`
  - Loader: `glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" })`
  - Required frontmatter:
    - `title: string`
    - `description: string`
    - `date: Date` via `z.coerce.date()`
  - Optional frontmatter:
    - `draft: boolean`
    - `tags: string[]`
    - `series: string`
    - `image: { url: string; alt: string }`
- `projects`
  - Loader: `glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" })`
  - Required frontmatter:
    - `title: string`
    - `description: string`
    - `image: { url: string; alt: string }`
  - Optional frontmatter:
    - `liveUrl: string` validated with `z.url()`
    - `githubUrl: string` validated with `z.url()`

Important implementation details:

- Blog entries with `draft: true` are filtered out of the homepage posts section, the `/blog` index, and `getStaticPaths()` for `/blog/[...id]`. A draft post is not published.
- Project `liveUrl` and `githubUrl` are optional in the schema, but `src/pages/projects/[...id].astro` currently renders both links unconditionally. In practice, keep both populated unless you also update the template logic.
- `image.url` is a plain string, not Astro `ImageMetadata`. Current components use regular `<img>` tags, so frontmatter should point to a public path like `"/formsync.webp"` or a remote URL.
- The loaders allow `.md` and `.mdx`, but the repo currently contains only `.md` files and has no MDX integration configured. Do not add MDX content unless you also wire up MDX support.

## Runtime Behavior

- `/` is composed from `Hero`, `About`, `Projects`, `Posts`, and `Contact`.
- `src/components/Posts.astro` fetches blog entries with `getCollection("blog")`, filters out drafts, sorts by descending `date`, and shows the latest 3 entries.
- `src/pages/blog/index.astro` groups non-draft blog posts by year in descending order.
- `src/pages/blog/[...id].astro` uses `post.id` directly for route params. If content is later nested under subfolders, the generated URL will include those segments.
- `src/components/Projects.astro` shows only the first 3 project entries with no explicit sort.
- `src/components/Footer.astro` also slices the first 3 projects with no explicit sort.
- `src/pages/projects/index.astro` renders all project entries with no explicit sort.
- `src/pages/projects/[...id].astro` renders every project entry returned by the collection.
- `astro.config.mjs` reads `SITE.URL` from `src/consts.ts` for the Astro `site` setting and sitemap integration. It is currently the placeholder `https://your_site.com`; update that before relying on sitemap or canonical URL output.

## Code Conventions

- Use the `@/*` alias from `tsconfig.json`. No other path aliases are configured.
- Keep route files lowercase and component files PascalCase.
- This codebase is server-first Astro. Data loading happens directly in page/component frontmatter with `getCollection()`, not through a separate service layer.
- Props typing is mixed: some files use `interface Props`, others use `type Props`, and some destructure `Astro.props` without an explicit annotation. Follow the local file style; do not churn files just to normalize prop syntax.
- Inline `<style>` and `<script>` blocks are normal here. Existing examples include the mobile menu toggle, the card hover cursor effect, and marquee animations.
- Styling is Tailwind v4 in CSS-first mode:
  - `@import "tailwindcss";`
  - `@plugin '@tailwindcss/typography';`
  - `@theme { ... }`
  - There is no `tailwind.config.*`; theme variables live in `src/styles/global.css`.
- Fonts are configured in `astro.config.mjs` with `fontProviders.google()` and preloaded in `src/components/Head.astro` using `Font` from `astro:assets`.
- The site currently relies on plain `<img>` tags and public assets more than Astro image components.
- Prefer double quotes in imports and existing class-heavy Astro markup patterns.
- Formatting is controlled by Prettier plus `prettier-plugin-astro` and `prettier-plugin-tailwindcss`. There is no custom Prettier config, so run Prettier on touched files instead of hand-reformatting the whole repo.

## Commands

- `bun install`
- `bun run dev`
- `bun run build`
- `bun run preview`
- `bunx astro check`
- `bunx prettier --check .`
- `bunx prettier --write <paths>`

Use Bun for dependency and script execution unless the task explicitly requires changing the toolchain.

## Validation Checklist

- Minimum validation for code or content changes: `bunx astro check` and `bun run build`.
- For content changes, verify the exact frontmatter schema above before previewing routes.
- For metadata/domain changes, confirm `src/consts.ts` and `astro.config.mjs` stay in sync.
- Do not commit changes to `dist/` or `.astro/`.

## Commit Style

- Existing history is short and imperative, for example `migrate to bun (#1)`.
- Keep commit subjects brief and imperative.
- Issue references in parentheses are consistent with the current history when relevant.
