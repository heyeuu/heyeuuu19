# 博客与站点自定义说明（按当前仓库实现）

这个项目是一个基于 Astro 的静态个人站点，没有后台 CMS。站点配置、页面文案、博客文章和项目内容都直接维护在仓库里。

<<<<<<< HEAD
## 1. 目录总览

当前最关键的维护位置：

- `src/consts.ts`：站点信息、首页/博客/项目元信息、关于页内容、社交链接
- `src/components/`：导航、首页区块、博客元信息组件、页脚等
- `src/pages/`：各页面入口和动态路由
- `src/content.config.ts`：`blog` 与 `projects` 的 collection schema
- `src/content/blog/`：博客 Markdown 内容
- `src/content/projects/`：项目 Markdown 内容（当前尚未创建）
- `src/utils/blog.ts`：博客发布过滤、分组、标签/系列 slug 规则
- `src/utils/projects.ts`：项目排序规则
- `scripts/content/`：内容 CLI（new/check/patch）
- `public/`：静态资源（头像、项目图、favicon 等）

=======
本文档已根据当前代码与目录结构更新。

## 0. 当前状态（2026-03-24）

- 已存在内容目录：`src/content/blog/`
- 当前仅有 1 篇草稿：`src/content/blog/astro-monolume-guide.md`（`draft: true`，含 TODO 占位）
- `src/content/projects/` 目前尚未创建（使用 CLI 新建项目时会自动创建）

## 1. 目录总览

当前最关键的维护位置：

- `src/consts.ts`：站点信息、首页/博客/项目元信息、关于页内容、社交链接
- `src/components/`：导航、首页区块、博客元信息组件、页脚等
- `src/pages/`：各页面入口和动态路由
- `src/content.config.ts`：`blog` 与 `projects` 的 collection schema
- `src/content/blog/`：博客 Markdown 内容
- `src/content/projects/`：项目 Markdown 内容（当前尚未创建）
- `src/utils/blog.ts`：博客发布过滤、分组、标签/系列 slug 规则
- `src/utils/projects.ts`：项目排序规则
- `scripts/content/`：内容 CLI（new/check/patch）
- `public/`：静态资源（头像、项目图、favicon 等）

>>>>>>> 47c5d46 (update:update BLOG_CUSTOMIZATION.md)
## 2. 本地预览

```bash
bun install
bun run dev
```

默认地址：`http://localhost:4321`

常用命令：

```bash
bun run build
bun run preview
bunx astro check
bun run content:new
bun run content:check
bun run content:patch -- --type blog --set draft=false
```

## 3. 修改站点基础信息（`src/consts.ts`）

当前站点常量如下（节选）：

```ts
export const SITE = {
  URL: "https://me.heyeuuu19.com",
  TITLE: "Liu Heyi",
  DESCRIPTION: "...",
  OG_IMAGE: "/liuheyi.jpg",
  OG_IMAGE_ALT: "Portrait of Liu Heyi",
  EMAIL: "heyeuuu19@gmail.com",
};
```

字段作用：

- `SITE.URL`：用于 `astro.config.mjs` 的 `site`，影响 sitemap/canonical/OG 绝对地址
- `SITE.TITLE`：全站标题（Header、Footer、页面标题后缀）
- `SITE.DESCRIPTION`：默认描述（about/contact/404 等页面在用）
- `SITE.OG_IMAGE` / `SITE.OG_IMAGE_ALT`：默认分享图
- `SITE.EMAIL`：页脚 `mailto:` 使用

当前社交链接：

```ts
export const SOCIALS = [
  { NAME: "Email", HREF: "mailto:heyeuuu19@gmail.com" },
  { NAME: "Github", HREF: "https://github.com/heyeuu" },
];
```

可以直接增删改。

## 4. 页面文案与区块来源

### 4.1 导航栏

文件：`src/components/Header.astro`

当前导航项是组件内的本地数组（`Home/About/Work/Blog/Contact`），不是从 `consts.ts` 读取。

### 4.2 首页首屏 Hero

文件：`src/components/Hero.astro`

Hero 文案来自：

- 主标题：`SITE.TITLE`
- 副标题：`HOME.HERO_SUBTITLE`
- 两个按钮：`HOME.HERO_PRIMARY_CTA` / `HOME.HERO_SECONDARY_CTA`

所以这里不是“写死副标题”，而是可在 `src/consts.ts` 统一修改。

### 4.3 About 区块

文件：`src/components/About.astro`

内容来源全部是 `ABOUT` 常量：标题、图片、段落、技能标题、技能列表。

### 4.4 Contact 区块

文件：`src/components/Contact.astro`

- 标题与说明文案目前写在组件内
- 社交链接来自 `SOCIALS`
- 表单仅为前端 UI，没有 `action`/后端提交逻辑

### 4.5 Footer

文件：`src/components/Footer.astro`

- 站点名、邮箱来自 `SITE`
- 社交列表来自 `SOCIALS`
- Projects 列会读取 `getCollection("projects")`，按排序规则取前 3 个

## 5. 博客内容维护

### 5.1 博客 schema（`src/content.config.ts`）

```yaml
---
title: "文章标题"
description: "文章摘要"
date: "2026-03-24"
draft: false
tags:
  - Astro
  - Notes
series: "Astro Notes"
image:
  url: "/my-post-cover.webp"
  alt: "封面图说明"
---
```

字段说明：

- `title`：必填，字符串
- `description`：必填，字符串
- `date`：必填，日期（`z.coerce.date()`）
- `draft`：可选，布尔值
- `tags`：可选，字符串数组
- `series`：可选，字符串
- `image`：可选对象，含 `url`/`alt`

### 5.2 发布规则

博客发布统一用 `getPublishedBlogPosts()` 过滤：`draft: true` 会被隐藏。

隐藏范围：

- 首页 `Posts` 区块
- `/blog`
- `/blog/[...id]` 的静态路径生成
- `/blog/tags*` 与 `/blog/series*`（因为都基于已发布文章）

### 5.3 博客路由与页面

- `/blog`：总览（统计卡片 + 热门标签 + 系列 + 年份归档）
- `/blog/[...id]`：文章详情
- `/blog/tags`：标签总览
- `/blog/tags/[tag]`：单标签页面
- `/blog/series`：系列总览
- `/blog/series/[series]`：单系列页面

### 5.4 标签与系列的行为

核心逻辑在 `src/utils/blog.ts`：

- 标签聚合：`getTagGroups(posts)`
- 系列聚合：`getSeriesGroups(posts)`
- 标签路径：`getTagPath(tag)` -> `/blog/tags/<slug>`
- 系列路径：`getSeriesPath(series)` -> `/blog/series/<slug>`

`slug` 由 `toTaxonomySlug()` 生成，支持 Unicode 字母数字（包括中文），空格/下划线会归一化为 `-`。

### 5.5 详情页附加内容

`src/pages/blog/[...id].astro` 里还包含：

- 标签和系列 pills
- 可选头图（仅在 `image` 存在时显示）
- 系列内文章列表（同系列且数量 > 1）
- 根据共同标签推荐的相关文章（最多 3 篇）

## 6. 项目内容维护

### 6.1 项目 schema（`src/content.config.ts`）

```yaml
---
title: "项目名"
description: "项目简介"
order: 1
date: "2026-03-24"
liveUrl: "https://example.com"
githubUrl: "https://github.com/yourname/project"
image:
  url: "/project-cover.webp"
  alt: "项目封面说明"
---
```

字段说明：

- `title`：必填
- `description`：必填
- `image`：必填，`url` 和 `alt`
- `order`：可选，整数
- `date`：可选，日期
- `liveUrl`：可选，需合法 URL
- `githubUrl`：可选，需合法 URL

### 6.2 排序规则

`src/utils/projects.ts`：

1. `order` 升序
2. `date` 降序
3. `id` 升序

### 6.3 展示位置

- 首页 `Projects` 区块：排序后前 3 个
- 页脚 `Projects`：排序后前 3 个
- `/projects`：全部项目（同排序）
- `/projects/[...id]`：项目详情

### 6.4 详情页按钮逻辑

`src/pages/projects/[...id].astro` 已做条件渲染：

- 有 `githubUrl` 才显示 `Source`
- 有 `liveUrl` 才显示 `Live Demo`

## 7. 内容 CLI（`scripts/content`）

### 7.1 命令

```bash
bun run content:new
bun run content:check
bun run content:patch -- --type blog --set draft=false
```

等价入口：

```bash
bun ./scripts/content/index.ts new
bun ./scripts/content/index.ts check
bun ./scripts/content/index.ts patch --type blog --set draft=false
```

### 7.2 `new`（新建内容）

示例：

```bash
bun run content:new -- --type blog --title "Astro Content Workflow"
bun run content:new -- --type projects --title "Form Builder" --slug form-builder
```

支持参数：

- `--type blog|projects`（`project` 会自动归一化为 `projects`）
- `--title`
- `--slug`
- `--format md|mdx`
- `--no-prompt`
- `--dry-run`

模板行为：

- Blog 模板默认 `draft: true`
- 模板里会带 TODO 占位（`description`、正文段落、项目图 `alt` 等）
- 如果目录不存在，脚本会自动 `mkdir -p`

### 7.3 `check`（检查内容）

```bash
bun run content:check
bun run content:check -- --type blog
bun run content:check -- --type projects
```

会检查：

- frontmatter 是否存在
- 必填字段/类型是否合法
- 文件名 slug 是否是小写连字符风格
- TODO 占位是否未替换（warning）

### 7.4 `patch`（批量改 frontmatter）

```bash
bun run content:patch -- --type blog --set draft=true
bun run content:patch -- --type blog --set series="Astro Notes"
bun run content:patch -- --type projects --set image.url="/default-cover.webp"
bun run content:patch -- --type projects --set githubUrl=null
```

说明：

- 作用范围是整个 collection，不支持筛选表达式
- `--set` 可重复
- `null` 表示删除字段
- 支持点路径（如 `image.url`）
- patch 后会做 schema 验证，错误会中止

## 8. 图片、样式与字体

### 8.1 图片

`public/` 当前常见资源：

- `public/favicon.svg`
- `public/liuheyi.jpg`
- `public/portrait.webp`
- `public/formsync.webp`
- `public/promptsmith.webp`
- `public/zentrack.webp`

frontmatter 的 `image.url` 当前是普通字符串路径（常用 `/xxx.webp`），不是 `ImageMetadata`。

### 8.2 全局样式

文件：`src/styles/global.css`

- Tailwind v4 CSS-first：`@import "tailwindcss"`
- Typography 插件：`@plugin '@tailwindcss/typography'`
- 主题变量：
  - 颜色：`--color-primary` / `--color-background` / `--color-foreground` / `--color-secondary`
  - 字体：`--font-plex` / `--font-geist`

### 8.3 字体

`astro.config.mjs` 配置了 Google Fonts：

- IBM Plex Mono
- Geist

并在 `src/components/Head.astro` 里通过 `<Font cssVariable="..." preload />` 预加载。

## 9. 修改后建议检查

至少执行：

```bash
bunx astro check
bun run build
```

内容改动前建议再跑：

```bash
bun run content:check
```

人工检查清单：

1. `SITE.URL` 是否为正式域名
2. `SOCIALS`、邮箱、OG 图是否正确
3. frontmatter 的图片路径是否真实存在
4. 需要发布的文章是否仍是 `draft: true`
5. `tags` / `series` 命名是否统一（避免同义不同写）
6. 项目排序字段 `order` / `date` 是否符合预期

## 10. 最快上手的文件

如果只想快速改出效果，优先看：

- `src/consts.ts`
- `src/components/Hero.astro`
- `src/components/About.astro`
- `src/components/Contact.astro`
- `src/components/Footer.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/tags/index.astro`
- `src/pages/blog/series/index.astro`
- `src/pages/projects/index.astro`
- `src/content/blog/`
- `src/content/projects/`
- `public/`
