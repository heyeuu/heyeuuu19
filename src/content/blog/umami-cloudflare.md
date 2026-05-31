---
title: "博客指南 | 使用 Umami 和 Cloudflare 给博客加上访问量统计"
description: "从方案选择到博客接入，梳理我用 Umami 和 Cloudflare 为博客增加访问量统计的完整过程。"
date: "2026-04-19"
draft: false
tags:
  - 博客
  - 网站统计
  - Umami
  - Cloudflare
series: "博客指南"
image:
  url: "https://me19.heyeuuu19.com/blog/astro/umami_cloudflare.jpg"
  alt: "Umami和Cloudflare部署博客封面图"
---

最初的想法很简单：给博客加上访问量统计。

综合权衡之后，我把方案定在了 Umami + Cloudflare (看起来还不错，如果体验不佳就换个方案好了，快读迭代说是)。

## 方案选型

### 为什么选 Umami

Umami 是一个开源、隐私优先的网站统计工具。它通常会被当作 Google Analytics 的轻量替代品，但它的风格和思路明显更克制。

我最后选择它，主要是这几个原因：

- 隐私友好：不收集个人身份信息，不依赖 Cookie，也不做跨站追踪。在很多场景下，这意味着你不需要为了访问统计额外弹一个很烦的 Cookie 同意框。
- 足够轻：脚本体积很小，对页面性能影响低，不会为了一个访问统计把静态博客拖慢。
- 仪表盘简单：相比 Google Analytics 那种信息量巨大但不容易看明白的后台，Umami 的数据面板更直接。
- 支持多站点：一个实例可以挂多个站点。
- 支持事件追踪：除了 pageview，还可以做按钮点击、表单提交等自定义事件。

对于个人博客来说，我需要的是：

1. 能知道文章大概被看了多少次。
2. 不要给访问者增加额外负担。
3. 不要把接入过程搞得非常重。

从这个角度看，Umami 可能是个不错的选择。

### 为什么考虑 Cloudflare

如果只是用 Umami 官方托管服务，那么事情已经足够简单；但如果想把整套东西掌握在自己手里，Cloudflare 这条路线也很有吸引力。

原因也很实际：

- 我这个博客本身就是部署在 Cloudflare 上的
- 部署基础设施轻，适合静态博客这类场景
- Worker 很适合拿来做一层 API 代理
- D1、Workers、Pages 这些服务可以拼出一套相对完整的边缘方案

Umami 官方原生主要支持 PostgreSQL 和 MySQL。它并不直接支持 Cloudflare D1，但由于 Umami 是开源的，社区已经有人做了适配 D1 的版本。所以从方案上看，Umami + Cloudflare D1 是可以成立的。

### 整体架构

因为 Umami 的管理 API 不能直接暴露给前端，所以我最终采用的是"三段式"结构：

- Astro 站点：负责加载 Umami 脚本
- Cloudflare Worker：负责带着私密凭据去请求 Umami API
- 博客文章页：只请求 Worker 暴露出来的公开 pageviews 接口

当前博客里的 pageviews 功能链路可以概括成这样：

```text
访客打开博客文章
  -> 页面加载 Umami tracking script
  -> Umami 记录 pageview
  -> 文章页前端请求 /api/pageviews/blog/<slug>
  -> Cloudflare Worker 带凭据去查询 Umami stats API
  -> Worker 返回公开 JSON
  -> 前端把浏览量渲染到文章页
```

对应到仓库里的文件，大致是：

- `src/components/Head.astro`：注入 Umami 脚本
- `src/pages/blog/[...id].astro`：决定文章页是否显示浏览量组件
- `src/components/blog/PostPageviews.astro`：拼接文章对应的 API URL
- `public/scripts/post-pageviews.js`：浏览器发请求并更新 DOM
- `workers/umami-pageviews/src/index.ts`：Worker 代理 Umami API

## 实现过程

1. **准备 Wrangler**

   Wrangler 是 Cloudflare 的 CLI 工具，用 bun 安装：

   ```bash
   # 全局安装 wrangler
   bun add -g wrangler

   # 登录 Cloudflare
   wrangler login
   ```

2. **在站点里加载 Umami 脚本**

   在 `Head.astro` 中注入 Umami 脚本，只在生产环境下加载：

   ```ts
   const umamiWebsiteId = import.meta.env.PUBLIC_UMAMI_WEBSITE_ID;
   const shouldLoadUmami = import.meta.env.PROD && Boolean(umamiWebsiteId);
   ```

3. **在文章页挂上 pageviews 组件**

   文章页根据 `PUBLIC_UMAMI_STATS_API_URL` 是否配置来决定是否渲染浏览量：

   ```ts
   const hasPageviews = Boolean(import.meta.env.PUBLIC_UMAMI_STATS_API_URL);
   ```

   配了就渲染 `PostPageviews`，没配就显示 `Pageview tracking is disabled.`。

4. **用 Worker 暴露一个公开 pageviews API**

   前端不能直接调用 Umami 的管理 API，因为那需要把认证 token 放在浏览器端，等于把密钥公开了。所以中间加了一层 Worker 代理：

   ```text
   GET /api/pageviews/blog/your-post
   ```

   Worker 负责路径标准化、凭据注入、结果聚合后返回给前端。

5. **前端在浏览器里拿数据并渲染**

   `PostPageviews.astro` 根据文章 `postId` 生成 API 地址，浏览器脚本请求并填入页面。初始显示 `...`，成功后替换为数字，失败显示 `N/A`。

## 踩坑与修复

### 1. Umami stats 响应结构不一致

Umami 的 pageviews 字段在不同版本或不同查询方式下，返回格式不一致——有时是数字，有时是 `{ value, prev }` 对象。原代码直接做加法，遇到对象时 JS 会隐式转成字符串拼接，导致 NaN。

解决方式是在 Worker 里加类型判断，兼容两种返回格式：

```ts
function getUmamiMetricValue(metric) {
  if (typeof metric === "number") return metric;
  if (
    metric &&
    typeof metric === "object" &&
    typeof metric.value === "number"
  ) {
    return metric.value;
  }
  return 0;
}
```

### 2. 页面显示 `Views N/A`

请求失败时前端显示 `N/A`。原因是不同版本的 Umami 在认证方式和筛选参数上有差异。

兼容方案：

1. Worker 同时支持 `UMAMI_API_KEY` 和 `UMAMI_BEARER_TOKEN` 两种认证
2. 请求 stats API 时同时带上 `path` 和 `url` 两个参数

### 3. 页面显示 `Pageview tracking is disabled.`

构建时没有拿到 `PUBLIC_UMAMI_STATS_API_URL`，文章页根本没有请求浏览量接口。

排查时注意区分：

- `Views N/A`：组件已渲染，但请求失败
- `Pageview tracking is disabled.`：组件根本没渲染

## 配置与部署

### 环境变量

**Astro 站点公开变量**（写在根目录 `.env` 里）：

```bash
PUBLIC_UMAMI_SCRIPT_URL="https://cloud.umami.is/script.js"
PUBLIC_UMAMI_WEBSITE_ID="your-umami-website-id"
PUBLIC_UMAMI_STATS_API_URL="https://your-worker.workers.dev/api/pageviews"
```

**Worker 私密变量**（通过 Wrangler secrets 配置）：

```bash
cd workers/umami-pageviews
bunx wrangler secret put UMAMI_WEBSITE_ID
bunx wrangler secret put UMAMI_API_KEY   # Umami Cloud
bunx wrangler secret put UMAMI_BEARER_TOKEN  # 自托管
```

### 部署步骤

先部署 Worker：

```bash
cd workers/umami-pageviews
bun run pageviews:sync
bunx wrangler deploy
```

然后回到项目根目录重新构建博客：

```bash
cd ../..
bunx astro check
bun run build
```

### 验证

打开一篇文章，检查浏览器是否请求了 `/api/pageviews/blog/<slug>` 且 Worker 返回 `200`。

常见问题：

- `Pageview tracking is disabled.` → 检查 `PUBLIC_UMAMI_STATS_API_URL`
- `Views N/A` → 检查 Worker secrets 和 Umami 认证方式
- `NaN` → 检查 stats API 返回结构是否为 `{ value, prev }`

## 总结

这次"给博客加访问量统计"真正重要的不是某一行代码，而是几个判断：页面埋点和页面展示是两回事，前端不能直接碰 Umami 管理 API，Worker 很适合承担这一层私有到公开的转换。

走完一遍之后，后面再加按钮点击统计、自定义事件或者项目页浏览量，路径就已经很清楚了。

## 参考

- Umami 项目主页：<https://umami.is/>
- Umami API 文档：<https://umami.is/docs/api>
- Umami 自托管 API 认证：<https://docs.umami.is/docs/api/authentication>
- Worker 说明文档：`workers/umami-pageviews/README.md`
