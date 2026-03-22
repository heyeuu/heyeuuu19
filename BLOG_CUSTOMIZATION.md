# 博客信息修改说明

这套博客是一个基于 Astro 的静态站点，没有后台管理界面。站点内容主要分散在 `src/consts.ts`、`src/components/`、`src/pages/` 和 `src/content/` 里维护。

## 1. 先在本地预览

安装依赖后，启动开发环境：

```bash
bun install
bun run dev
```

本仓库默认使用 `bun` 作为包管理器和脚本运行器。

启动后访问 `http://localhost:4321`，修改文件后页面会自动刷新。

## 2. 修改站点基础信息

站点级配置在 `src/consts.ts`：

```ts
export const SITE = {
  URL: "https://your_site.com",
  TITLE: "Mono Lume",
  DESCRIPTION: "站点描述",
  EMAIL: "hi@monolume.com",
};
```

这里分别控制：

- `URL`：网站正式域名。会被 `astro.config.mjs` 用作站点地址，影响 sitemap 等构建结果。
- `TITLE`：站点主标题。首页大标题、页脚标题、浏览器标题都会用到。
- `DESCRIPTION`：站点描述。主要用于页面描述信息，也可作为通用简介。
- `EMAIL`：联系邮箱显示文本。

社交链接同样在 `src/consts.ts` 的 `SOCIALS` 数组中维护：

```ts
export const SOCIALS = [
  { NAME: "X", HREF: "https://x.com/your_username" },
  { NAME: "Linkedin", HREF: "https://linkedin.com/" },
  { NAME: "Github", HREF: "https://github.com/your_username" },
];
```

可以直接新增、删除或修改平台名称和链接。

## 3. 修改页面标题和 SEO 描述

以下页面标题和描述也在 `src/consts.ts` 中：

- `HOME`：首页
- `BLOG`：博客列表页
- `PROJECTS`：项目列表页

这些值会传给页面布局，用在浏览器标题和 meta description 中。

## 4. 修改导航、首页文案、关于页、联系页

这部分内容主要写死在组件里，需要按区域分别修改。

### 导航栏

文件：`src/components/Header.astro`

可修改内容：

- 顶部导航名称
- 导航链接路径
- 是否保留 `Home / About / Work / Blog / Contact`

导航数据在文件顶部的 `links` 数组里。

### 首页首屏

文件：`src/components/Hero.astro`

可修改内容：

- 首页主标题：当前来自 `SITE.TITLE`
- 首页副标题介绍：写死在组件中
- 两个按钮文字：`View Work`、`Hire me`
- 按钮跳转链接

说明：当前副标题没有复用 `SITE.DESCRIPTION`，所以如果你只改了 `src/consts.ts` 里的描述，这里的文案不会自动变化。

### 关于我

文件：`src/components/About.astro`

可修改内容：

- `About me` 标题
- 个人介绍段落
- 技能列表
- 个人图片

关于页图片文件当前是 `public/portrait.webp`。如果要替换：

1. 用新图片覆盖 `public/portrait.webp`；或
2. 把 `src/components/About.astro` 里的图片路径改成新的文件名。

### 联系我

文件：`src/components/Contact.astro`

可修改内容：

- `Get in Touch` 标题
- 联系说明文案
- 社交链接展示区域
- 表单字段标题与按钮文字

说明：当前这个表单只有界面，没有配置 `action`、后端接口或第三方表单服务，所以点击提交不会真正发信。如果你只想展示联系方式，改邮箱和社交链接即可。

### 页脚

文件：`src/components/Footer.astro`

可修改内容：

- 页脚标语
- 联系区块标题
- 页脚导航
- 社交链接标题
- 页脚版权文案

注意：页脚里显示的邮箱文本来自 `SITE.EMAIL`，但 `mailto:` 链接当前是写死的 `someone@example.com`。如果要改邮箱，请同时检查这个文件里的链接。

## 5. 修改博客文章

博客文章都在 `src/content/blog/` 目录下，每个 `.md` 或 `.mdx` 文件就是一篇文章。

例如：

- `src/content/blog/welcome-to-blog.md`
- `src/content/blog/about-this-template.md`

### 新增文章

直接在 `src/content/blog/` 下新建一个 Markdown 文件，例如：

`src/content/blog/my-first-post.md`

文件名会影响文章地址：

- 文件：`src/content/blog/my-first-post.md`
- 路由：`/blog/my-first-post`

### 文章 frontmatter 格式

博客文章需要符合 `src/content.config.ts` 中定义的格式：

```yaml
---
title: "文章标题"
description: "文章摘要"
date: "2026-03-21"
draft: false
tags:
  - Astro
  - Blog
series: My-Series
image:
  url: "/my-post-cover.webp"
  alt: "封面图说明"
---
```

字段说明：

- `title`：文章标题，必填。
- `description`：文章摘要，必填。
- `date`：发布日期，必填，建议使用 `YYYY-MM-DD`。
- `draft`：是否为草稿，可选。设为 `true` 后不会出现在博客列表，也不会生成文章页面。
- `tags`：标签数组，可选。
- `series`：系列名称，可选。
- `image`：封面图，可选。

### 修改文章内容

frontmatter 下方就是正文，直接用 Markdown 编写即可。

支持常见 Markdown 语法：

- 标题
- 列表
- 引用
- 代码块
- 表格
- 图片
- 链接

可以参考现有示例：

- `src/content/blog/markdown-style-guide.md`
- `src/content/blog/about-this-template.md`

### 删除或隐藏文章

有两种方式：

1. 直接删除对应的 `.md` / `.mdx` 文件。
2. 保留文件，但在 frontmatter 中写 `draft: true`。

如果只是暂时不想公开，建议使用 `draft: true`。

## 6. 修改项目列表

项目内容在 `src/content/projects/` 目录下，每个 Markdown 文件对应一个项目详情页。

例如：

- `src/content/projects/promptsmith.md`
- `src/content/projects/formsync.md`
- `src/content/projects/zentrack.md`

### 项目 frontmatter 格式

项目格式在 `src/content.config.ts` 中定义，示例：

```yaml
---
title: "项目名"
description: "项目简介"
liveUrl: "https://example.com"
githubUrl: "https://github.com/yourname/project"
image:
  url: "/project-cover.webp"
  alt: "项目封面说明"
---
```

字段说明：

- `title`：项目标题，必填。
- `description`：项目简介，必填。
- `liveUrl`：在线地址，可选。
- `githubUrl`：源码地址，可选。
- `image`：项目封面图，必填。

正文区域就是项目详情介绍，会显示在项目详情页里。

### 项目展示规则

- 首页项目区块会读取前 3 个项目。
- 页脚项目区块也会读取前 3 个项目。
- 项目列表页会读取全部项目。

如果你想调整顺序，最简单的方式是调整文件内容来源或后续在代码里加入排序字段。目前项目 collection 没有单独的排序字段。

## 7. 修改图片、图标和静态资源

公开可访问的静态资源都在 `public/` 目录。

当前常见资源包括：

- `public/favicon.svg`：网站 favicon
- `public/portrait.webp`：关于页头像
- `public/promptsmith.webp`
- `public/formsync.webp`
- `public/zentrack.webp`

修改方式：

1. 用同名文件直接替换。
2. 或上传新文件，再去对应内容文件/组件里改路径。

如果图片放在 `public/` 下，引用时直接从根路径开始写，例如：

```txt
/portrait.webp
/my-cover.png
```

## 8. 修改样式、颜色和字体

全局样式文件：`src/styles/global.css`

这里可以修改：

- 全站字体变量
- 主色、背景色、文字色
- 正文字体样式
- Markdown 正文排版

颜色变量示例：

```css
--color-primary
--color-background
--color-foreground
--color-secondary
```

字体加载配置在 `astro.config.mjs`，当前使用：

- `IBM Plex Mono`
- `Geist`

如果需要更换字体，通常要同时修改：

- `astro.config.mjs`
- `src/styles/global.css`

## 9. 修改其他独立页面

以下页面也可以单独修改：

- `src/pages/about.astro`：关于页入口
- `src/pages/contact.astro`：联系页入口
- `src/pages/blog/index.astro`：博客列表页结构
- `src/pages/projects/index.astro`：项目列表页结构
- `src/pages/404.astro`：404 页面

说明：

- `src/pages/*.astro` 主要决定页面结构和组合哪些组件。
- 真正的文案通常还是写在 `src/components/` 或 `src/content/` 中。

## 10. 发布前建议检查

完成修改后，建议至少检查这几项：

1. 站点标题、邮箱、社交链接是否已经替换掉模板默认值。
2. 示例文章和示例项目是否需要删除。
3. 图片路径是否正确，页面是否能正常显示封面图。
4. 导航链接是否和实际页面一致。
5. 执行一次构建确认没有格式错误：

```bash
bun run build
```

## 11. 当前项目里最常需要改的文件

如果你只想快速开始，通常优先修改这些文件：

- `src/consts.ts`
- `src/components/Hero.astro`
- `src/components/About.astro`
- `src/components/Contact.astro`
- `src/components/Footer.astro`
- `src/content/blog/`
- `src/content/projects/`
- `public/portrait.webp`
- `public/favicon.svg`

如果后面你愿意，我也可以继续把这些“分散在组件里的文案”再整理成统一配置，这样以后改博客信息只需要改一个配置文件。

## 12. 使用内容脚手架工具

现在项目已经带了一套内容 CLI，用来减少手动新建 Markdown 文件时的重复劳动。

### 常用命令

使用 `bun` 运行：

```bash
bun run content:new
bun run content:check
bun run content:patch -- --type blog --set draft=false
```

如果你在其他环境不使用 Bun，也可以直接用 Node：

```bash
node scripts/content/index.mjs new
node scripts/content/index.mjs check
node scripts/content/index.mjs patch --type blog --set draft=false
```

### 1. 交互式新建内容

执行：

```bash
bun run content:new
```

脚本会通过问答方式引导你：

- 选择内容类型：`blog` 或 `projects`
- 输入标题
- 确认 slug

默认会生成一个带占位内容的 `.md` 文件，不要求你在终端里一次性写完 `description`、`tags` 等长字段。

### 2. 最小化参数新建

如果你想半自动化，也可以只传最少参数：

```bash
bun run content:new -- --type blog --title "Astro Content Workflow"
bun run content:new -- --type projects --title "Form Builder" --slug form-builder
```

说明：

- `title` 是最核心字段。
- `slug` 不传时会自动根据标题推导。
- 如果标题无法安全推导出 slug（例如纯中文标题），建议手动传 `--slug`。
- 默认文件格式是 `.md`，如果需要可传 `--format mdx`。

### 3. dry-run 预览

如果你想先看生成结果，不立刻落盘：

```bash
bun run content:new -- --type blog --title "Draft Post" --slug draft-post --dry-run
```

它会打印出将要创建的文件路径和模板内容，但不会真正写文件。

### 4. 内容检查

执行：

```bash
bun run content:check
```

这个命令会检查：

- frontmatter 是否存在
- 必填字段是否缺失
- 字段类型是否明显异常
- 文件名 slug 是否符合小写连字符风格

如果你修改了很多内容文件，建议在提交前跑一次。

### 5. 批量修改 frontmatter

第一版 `patch` 只支持按 collection 全量修改，不支持复杂筛选。

例如：

```bash
bun run content:patch -- --type blog --set draft=true
bun run content:patch -- --type blog --set series="Astro Notes"
bun run content:patch -- --type projects --set githubUrl=null
```

说明：

- `--type` 只能指定整个 collection，例如 `blog` 或 `projects`
- `--set key=value` 可以重复传多次
- `null` 表示删除该字段
- 支持点路径，例如：

```bash
bun run content:patch -- --type projects --set image.url="/default-cover.webp"
```

### 6. 生成后的默认约定

- 新建 blog 会默认写入 `draft: true`，避免未完成文章直接发布。
- blog 的 `description`、project 的 `description` 和 `image.alt` 会先写成 `TODO` 占位，后续再手动补全。
- project 模板会默认生成一个以 slug 命名的封面图路径，例如 `/my-project.webp`，你需要自行把图片放进 `public/` 或改成正确路径。
