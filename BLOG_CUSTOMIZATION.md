# 博客与站点自定义说明

这个项目是一个基于 Astro 的静态个人站点，没有后台管理界面。站点信息、页面文案、博客文章和项目内容都直接维护在仓库里。

当前仓库的内容主要分布在这些位置：

- `src/consts.ts`：站点标题、页面 SEO 文案、社交链接、邮箱、默认 OG 图
- `src/components/`：首页区块、导航、页脚、联系区块等可复用组件
- `src/pages/`：各页面入口，以及博客和项目详情页、标签页、系列页
- `src/content.config.ts`：博客和项目 collection 的 frontmatter schema
- `src/content/blog/`：博客文章
- `src/content/projects/`：项目内容
- `scripts/content/`：内容脚手架和检查工具
- `public/`：公开静态资源，如封面图、头像、favicon

如果当前工作区里还没有 `src/content/` 目录，也属于正常情况。首次手动写内容时创建对应目录即可；用 CLI 新建内容时，脚本也会自动创建父目录。

## 1. 本地预览

```bash
bun install
bun run dev
```

默认开发地址是 `http://localhost:4321`。

这个仓库默认使用 Bun 作为包管理器和脚本运行器。

## 2. 修改站点基础信息

站点级配置在 `src/consts.ts`。

```ts
export const SITE = {
  URL: "https://your_site.com",
  TITLE: "Mono Lume",
  DESCRIPTION: "...",
  OG_IMAGE: "/portrait.webp",
  OG_IMAGE_ALT: "Portrait of Mono Lume",
  EMAIL: "hi@monolume.com",
};
```

字段作用：

- `URL`：正式站点域名。`astro.config.mjs` 会用它生成 sitemap 和 canonical URL。
- `TITLE`：站点主标题，会出现在首页、页脚和浏览器标题等位置。
- `DESCRIPTION`：默认站点简介。
- `OG_IMAGE`：默认分享图。
- `OG_IMAGE_ALT`：默认分享图的替代文本。
- `EMAIL`：页脚邮箱和其他联系场景使用的邮箱地址。

社交链接同样在 `src/consts.ts`：

```ts
export const SOCIALS = [
  { NAME: "X", HREF: "https://x.com/your_username" },
  { NAME: "Linkedin", HREF: "https://linkedin.com/" },
  { NAME: "Github", HREF: "https://github.com/your_username" },
];
```

你可以直接新增、删除或修改平台名称和链接。

## 3. 修改页面标题和 SEO 描述

以下页面级文案也在 `src/consts.ts`：

- `HOME`
- `BLOG`
- `PROJECTS`

这些值会传给布局组件，用于浏览器标题、描述信息，以及分享卡片默认内容。

## 4. 修改导航、首页、关于页、联系页和页脚

### 导航栏

文件：`src/components/Header.astro`

可改内容：

- 顶部导航名称
- 导航跳转地址
- 是否保留 `Home / About / Work / Blog / Contact`

### 首页首屏

文件：`src/components/Hero.astro`

可改内容：

- 大标题，当前来自 `SITE.TITLE`
- 副标题文案，当前写死在组件里
- 两个按钮的文案和跳转目标

注意：这里的副标题不是自动读取 `SITE.DESCRIPTION`。

### 关于区块

文件：`src/components/About.astro`

可改内容：

- 标题
- 个人介绍
- 技能列表
- 头像路径

当前头像文件在 `public/portrait.webp`。

### 联系区块

文件：`src/components/Contact.astro`

可改内容：

- 标题
- 引导文案
- 社交链接展示
- 表单字段标题与按钮文案

注意：当前联系表单只有前端界面，没有 `action`、后端接口或第三方表单服务配置，提交不会真正发送消息。

### 页脚

文件：`src/components/Footer.astro`

可改内容：

- 页脚标语
- 联系方式
- 导航链接
- 社交链接列表
- 版权文案

当前页脚邮箱链接已经使用 `SITE.EMAIL` 生成 `mailto:`，不再是写死地址。

## 5. 博客内容怎么改

博客内容目录是 `src/content/blog/`。

如果目录不存在，可以手动创建，也可以直接用内容 CLI 生成第一篇文章。

### 博客 frontmatter 格式

博客 schema 定义在 `src/content.config.ts`，当前字段如下：

```yaml
---
title: "文章标题"
description: "文章摘要"
date: "2026-03-22"
draft: false
tags:
  - Astro
  - Content
series: "Astro Notes"
image:
  url: "/my-post-cover.webp"
  alt: "封面图说明"
---
```

字段说明：

- `title`：必填，文章标题
- `description`：必填，文章摘要
- `date`：必填，建议使用 `YYYY-MM-DD`
- `draft`：可选，`true` 时不会出现在公开列表，也不会生成文章详情页
- `tags`：可选，字符串数组
- `series`：可选，字符串，用于系列归档
- `image`：可选，文章头图对象，包含 `url` 和 `alt`

### 博客路由规则

- `src/content/blog/my-first-post.md` 对应 `/blog/my-first-post`
- 如果你把文章放在子目录，例如 `src/content/blog/notes/astro.md`，路由会变成 `/blog/notes/astro`

### 当前博客页面结构

博客部分现在不只是一个列表页，还包含这些路由：

- `/blog`：博客总览页，展示统计、热门标签、系列入口和按年份归档
- `/blog/[...id]`：文章详情页
- `/blog/tags`：标签总览页
- `/blog/tags/[tag]`：单个标签页
- `/blog/series`：系列总览页
- `/blog/series/[series]`：单个系列页

### `tags` 和 `series` 的作用

- `tags` 用于按主题聚合文章
- `series` 用于把多篇文章串成阅读路径
- 标签和系列页的 slug 会根据名称自动生成
- 文章详情页会显示标签和系列入口
- 如果一篇文章属于某个系列，详情页还会显示该系列的其他文章
- 详情页还会根据共同标签推荐相关文章

### 发布与隐藏规则

- 首页 `Posts` 区块只展示已发布文章中的最新 3 篇
- `/blog` 列表页只展示已发布文章
- `draft: true` 的文章不会出现在公开页面，也不会生成详情路由

### 建议

- 博客正文优先使用 `.md`
- 虽然 loader 和 CLI 参数里都允许 `.mdx`，但当前项目没有配置 MDX integration。除非你先给 Astro 加上 MDX 支持，否则不要新增 `.mdx`

## 6. 项目内容怎么改

项目内容目录是 `src/content/projects/`。

每个 Markdown 文件对应一个项目详情页。

### 项目 frontmatter 格式

项目 schema 定义在 `src/content.config.ts`，当前字段如下：

```yaml
---
title: "项目名"
description: "项目简介"
order: 1
date: "2026-03-22"
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
- `order`：可选，整数。数值越小越靠前
- `date`：可选，通常用于没有 `order` 时辅助排序
- `liveUrl`：可选，线上地址
- `githubUrl`：可选，源码地址
- `image`：必填，包含 `url` 和 `alt`

### 项目排序规则

项目排序逻辑在 `src/utils/projects.ts`，当前规则是：

1. `order` 升序
2. `date` 降序
3. `id` 升序

如果你希望项目顺序稳定可控，建议显式填写 `order`，必要时再补 `date`。

### 项目展示位置

- 首页 `Work` 区块展示排序后的前 3 个项目
- `/projects` 展示全部项目
- `/projects/[...id]` 是项目详情页

项目详情页会根据是否填写 `githubUrl` 和 `liveUrl` 决定是否显示 `Source` / `Live Demo` 按钮。

## 7. 用内容 CLI 管理博客和项目

这个仓库已经内置一套内容 CLI，入口在 `scripts/content/index.mjs`。

### 常用命令

```bash
bun run content:new
bun run content:check
bun run content:patch -- --type blog --set draft=false
```

也可以直接用 Node：

```bash
node scripts/content/index.mjs new
node scripts/content/index.mjs check
node scripts/content/index.mjs patch --type blog --set draft=false
```

### 新建内容

交互式：

```bash
bun run content:new
```

半自动：

```bash
bun run content:new -- --type blog --title "Astro Content Workflow"
bun run content:new -- --type projects --title "Form Builder" --slug form-builder
```

支持的常用参数：

- `--type blog`
- `--type projects`
- `--type project`
- `--title "..."`
- `--slug "..."`
- `--dry-run`
- `--no-prompt`
- `--format md`
- `--format mdx`

注意：

- `project` 会自动规范成 `projects`
- 不传 `slug` 时会根据标题自动生成
- 如果标题无法稳定生成 slug，例如纯中文标题，建议手动传 `--slug`
- 当前项目没有 MDX integration，所以实际仍建议使用 `--format md`

### 新建后的默认模板行为

- blog 模板默认写入 `draft: true`
- blog 的 `description`、project 的 `description` 和 `image.alt` 可能先是 `TODO` 占位
- project 模板会默认生成 `/${slug}.webp` 作为封面路径，需要你自己把图片放进 `public/` 或手动改路径

### 内容检查

```bash
bun run content:check
```

这个命令会检查：

- frontmatter 是否存在
- 必填字段是否缺失
- 字段类型是否不合法
- 文件名 slug 是否符合小写连字符风格
- 一些 `TODO` 占位字段是否还没替换

也可以只检查某个 collection：

```bash
bun run content:check -- --type blog
bun run content:check -- --type projects
```

### 批量修改 frontmatter

```bash
bun run content:patch -- --type blog --set draft=true
bun run content:patch -- --type blog --set series="Astro Notes"
bun run content:patch -- --type projects --set githubUrl=null
bun run content:patch -- --type projects --set image.url="/default-cover.webp"
```

说明：

- `patch` 当前按整个 collection 生效，不支持复杂筛选
- `--set key=value` 可以重复传多次
- `null` 表示删除字段
- 支持点路径，例如 `image.url`

## 8. 图片、图标和静态资源

公开可访问的静态资源放在 `public/`。

当前常见资源有：

- `public/favicon.svg`
- `public/portrait.webp`
- `public/formsync.webp`
- `public/promptsmith.webp`
- `public/zentrack.webp`

如果图片放在 `public/` 下，引用时直接写根路径，例如：

```txt
/portrait.webp
/my-post-cover.webp
```

博客和项目 frontmatter 里的 `image.url` 当前就是普通字符串，不是 Astro 的 `ImageMetadata`。

## 9. 样式、颜色和字体

全局样式在 `src/styles/global.css`。

这里目前管理：

- Tailwind v4 入口
- Typography 插件
- 颜色变量
- 字体变量
- 全局排版样式

当前主要主题变量：

```css
--color-primary
--color-background
--color-foreground
--color-secondary
--font-plex
--font-geist
```

字体加载配置在 `astro.config.mjs`，当前使用 Google Fonts：

- `IBM Plex Mono`
- `Geist`

如果你要换字体，通常至少要同时修改：

- `astro.config.mjs`
- `src/styles/global.css`

## 10. 其他常改页面

这些页面入口也经常需要单独调整：

- `src/pages/index.astro`
- `src/pages/about.astro`
- `src/pages/contact.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/tags/index.astro`
- `src/pages/blog/series/index.astro`
- `src/pages/projects/index.astro`
- `src/pages/404.astro`

一般来说：

- `src/pages/*.astro` 决定页面结构和区块组合
- `src/components/*.astro` 决定每个区块的具体文案和样式
- `src/content/` 决定博客和项目正文内容

## 11. 修改完成后建议检查

至少执行：

```bash
bun run build
```

如果你额外安装了 `@astrojs/check` 和 `typescript`，还可以执行：

```bash
bunx astro check
```

提交前建议确认：

1. `SITE.URL` 是否已经换成正式域名
2. 邮箱、社交链接、OG 图是否已经替换模板默认值
3. 博客和项目封面图路径是否存在
4. `draft: true` 的文章是否符合预期
5. `tags` 和 `series` 的命名是否统一，避免出现同义不同写法
6. 项目排序字段 `order` / `date` 是否已经设置

## 12. 最常需要改的文件

如果你想最快开始，优先看这些文件：

- `src/consts.ts`
- `src/components/Hero.astro`
- `src/components/About.astro`
- `src/components/Contact.astro`
- `src/components/Footer.astro`
- `src/pages/blog/index.astro`
- `src/content/blog/`
- `src/content/projects/`
- `public/portrait.webp`
- `public/favicon.svg`
