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

最初的想法很简单：我想给自己的博客加上一个访问量统计功能。

这件事表面上只是“在页面上显示一个浏览量数字”，但真做下来会发现它其实牵涉三层问题：

- 统计数据由谁采集
- 数据存在哪里
- 前端如何安全地把它展示出来

综合权衡之后，我把方案定在了 `Umami + Cloudflare` 这条线上来折腾。前半段是方案选择，后半段是这次在当前博客里真正落地 pageviews 功能时踩过的坑和最后成型的实现。

## 背景与选型

### 为什么选 Umami

`Umami` 是一个开源、隐私优先的网站统计工具。它通常会被当作 `Google Analytics` 的轻量替代品，但它的风格和思路明显更克制。

我最后选择它，主要是这几个原因：

- 隐私友好：不收集个人身份信息，不依赖 Cookie，也不做跨站追踪。在很多场景下，这意味着你不需要为了访问统计额外弹一个很烦的 Cookie 同意框。
- 足够轻：脚本体积很小，对页面性能影响低，不会为了一个访问统计把静态博客拖慢。
- 仪表盘简单：相比 Google Analytics 那种信息量巨大但不容易看明白的后台，Umami 的数据面板更直接。
- 支持多站点：一个实例可以挂多个站点。
- 支持事件追踪：除了 pageview，还可以做按钮点击、表单提交等自定义事件。

对于个人博客来说，我真正需要的不是一套庞大的营销分析系统，而是：

1. 能知道文章大概被看了多少次。
2. 不要给访问者增加额外负担。
3. 不要把接入过程搞得非常重。

从这个角度看，Umami 基本正中需求。

### 为什么考虑 Cloudflare

如果只是用 Umami 官方托管服务，那么事情已经足够简单；但如果想把整套东西掌握在自己手里，Cloudflare 这条路线也很有吸引力。

原因也很实际：
- 我这个博客本身就是部署在 Cloudflare 上的
- 部署基础设施轻，适合静态博客这类场景
- Worker 很适合拿来做一层 API 代理
- D1、Workers、Pages 这些服务可以拼出一套相对完整的边缘方案

Umami 官方原生主要支持 `PostgreSQL` 和 `MySQL`。它并不直接支持 `Cloudflare D1`，但由于 Umami 是开源的，社区已经有人做了适配 D1 的版本。所以从方案上看，`Umami + Cloudflare D1` 是可以成立的。

这篇文章里，重点不是自己重写 Umami，而是把当前博客“接上 Umami，并在文章页显示浏览量”这件事完整落地。

### 先把 Wrangler 准备好

既然要和 Cloudflare 生态打交道，`Wrangler` 这个 CLI 工具基本绕不过去。

我这边用的是 `bun`，所以命令是：

```bash
# 全局安装 wrangler
bun add -g wrangler

# 登录 Cloudflare
wrangler login
```

如果你用的是 `pnpm`、`npm` 或 `yarn`，对应替换成自己的包管理器即可。

## 方案设计

### 这次博客功能的目标

这次真正要完成的，不只是“接入 Umami 脚本”，而是把博客文章页的浏览量完整展示出来。

目标拆开后其实有两部分：

1. 让博客页面本身被 Umami 统计到。
2. 在文章页里把该文章的 pageviews 拉回来并展示。

第一部分只是埋点，第二部分才是这次实现里真正稍微麻烦的部分。

因为 Umami 的管理 API 不能直接暴露给前端，所以我最终采用的是“三段式”结构：

- Astro 站点：负责加载 Umami 脚本
- Cloudflare Worker：负责带着私密凭据去请求 Umami API
- 博客文章页：只请求 Worker 暴露出来的公开 pageviews 接口

### 整体架构

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

### 第一步：在站点里加载 Umami 脚本

这一步放在了 `Head.astro` 里。

逻辑很直接：

- 读取 `PUBLIC_UMAMI_WEBSITE_ID`
- 只有在生产环境下才注入脚本
- 默认脚本地址是 `https://cloud.umami.is/script.js`

相关代码的核心判断是：

```ts
const umamiWebsiteId = import.meta.env.PUBLIC_UMAMI_WEBSITE_ID;
const shouldLoadUmami = import.meta.env.PROD && Boolean(umamiWebsiteId);
```

也就是说，如果没有配置 `PUBLIC_UMAMI_WEBSITE_ID`，页面压根不会加载 Umami tracking script。

### 第二步：在文章页挂上 pageviews 组件

文章页里并不是无条件展示浏览量，而是先看有没有配置公开的 pageviews API。

核心判断在：

```ts
const hasPageviews = Boolean(import.meta.env.PUBLIC_UMAMI_STATS_API_URL);
```

这意味着：

- 配了 `PUBLIC_UMAMI_STATS_API_URL`，就渲染 `PostPageviews`
- 没配，就显示 `Pageview tracking is disabled.`

这里也是我后来排查问题时一个非常关键的点。这个文案不是 Umami 的报错，而是模板自己渲染出来的兜底状态。

### 第三步：用 Worker 暴露一个公开 pageviews API

前端不能直接调用 Umami 的管理 API，因为那会把密钥直接暴露在浏览器里。所以中间必须再加一层。

这个中间层就是 `workers/umami-pageviews`。

它提供的接口形态很简单：

```text
GET /api/pageviews/blog/your-post
```

返回的数据也很干净：

```json
{
  "pageviews": 128,
  "path": "/blog/your-post",
  "updatedAt": "2026-04-19T10:00:00.000Z"
}
```

Worker 在内部做了几件事：

- 只允许查询 `/blog` 和 `/projects` 下面的路径
- 把路径标准化，避免尾部斜杠导致统计分裂
- 同时查询 `/blog/post` 和 `/blog/post/` 两种变体
- 带着 Umami 的凭据向 stats API 请求数据
- 聚合结果后再返回给前端

### 第四步：前端在浏览器里拿数据并渲染

`PostPageviews.astro` 会根据文章 `postId` 生成对应的 API 地址，比如：

```text
/api/pageviews/blog/umami-cloudflare
```

浏览器侧脚本再去请求这个地址，并把拿到的 `pageviews` 填到页面里。

初始状态会显示 `...`，请求成功后替换成格式化过的数字，请求失败则显示 `N/A`。

到这里，功能链路就算是搭起来了。

## 踩坑与修复

链路搭完之后，问题才真正开始暴露出来。

### 1. Umami stats 响应结构和预期不一致

一开始我假定 Umami API 返回的是：

```json
{
  "pageviews": 123
}
```

但实际遇到的返回结构是：

```json
{
  "pageviews": {
    "value": 123,
    "prev": 100
  }
}
```

于是原先的聚合代码：

```ts
total + stats.pageviews
```

就会直接出问题。对象参与算术运算，结果不是字符串拼接就是 `NaN`。

后来的修复方式很明确：不再直接假定 `pageviews` 一定是 number，而是在 Worker 里显式提取数值。

核心思路是：

```ts
function getUmamiMetricValue(metric) {
  if (typeof metric === "number") return metric;
  if (metric && typeof metric === "object" && typeof metric.value === "number") {
    return metric.value;
  }
  return 0;
}
```

修完之后，Worker 端的聚合逻辑就稳定了，不会再因为 API 返回对象结构而出现 `NaN`。

### 2. 页面显示 `Views N/A`

把 `NaN` 问题修掉以后，我又看到了另一个状态：`Views N/A`。

这说明问题已经不在“数值解析”层了，而在“请求本身失败”这一层。因为前端脚本只要遇到下面两种情况之一，就会显示 `N/A`：

- HTTP 响应不是 `2xx`
- `fetch` 直接抛异常

继续往下追，我做了两件兼容：

1. Worker 同时支持两种 Umami 认证方式
   - `UMAMI_API_KEY`
   - `UMAMI_BEARER_TOKEN`
2. 请求 stats API 时同时带上 `path` 和 `url`

这样做的原因是不同部署方式、不同版本的 Umami 在认证和筛选参数上会有差异。只兼容一种写法，很容易在 Cloud 和自托管之间切换时失效。

另外，前端脚本也补了一层兼容逻辑：如果返回的是 `{ value }` 结构，也一样能正常显示。

### 3. 页面显示 `Pageview tracking is disabled.`

这个提示更容易让人误判，以为是 Umami 没跑起来。

实际上不是。

它的含义非常具体：站点在构建时没有拿到 `PUBLIC_UMAMI_STATS_API_URL`，所以文章页根本没有尝试去请求浏览量接口。

换句话说：

- `Views N/A`：说明组件已经渲染了，但请求失败了
- `Pageview tracking is disabled.`：说明组件都没渲染出来

这个区别很重要，因为它决定了排查方向完全不同。

## 配置、部署与验证

### 环境变量如何分工

这次功能里最容易混淆的，就是不同环境变量分别控制什么。

#### Astro 站点公开变量

写在项目根目录 `.env` 里：

```dotenv
PUBLIC_UMAMI_SCRIPT_URL="https://cloud.umami.is/script.js"
PUBLIC_UMAMI_WEBSITE_ID="your-umami-website-id"
PUBLIC_UMAMI_STATS_API_URL="https://your-worker.workers.dev/api/pageviews"
```

这几个变量的作用分别是：

- `PUBLIC_UMAMI_SCRIPT_URL`：Umami 脚本地址
- `PUBLIC_UMAMI_WEBSITE_ID`：控制是否加载 tracking script
- `PUBLIC_UMAMI_STATS_API_URL`：控制是否显示文章页浏览量组件

#### Worker 私密变量

这部分不能放到前端环境变量里。

如果你用的是 Umami Cloud：

```bash
bunx wrangler secret put UMAMI_WEBSITE_ID
bunx wrangler secret put UMAMI_API_KEY
```

如果你用的是自托管 Umami：

```bash
bunx wrangler secret put UMAMI_WEBSITE_ID
bunx wrangler secret put UMAMI_BEARER_TOKEN
```

自托管还需要把 `UMAMI_API_ENDPOINT` 指向自己的 Umami API 地址，例如：

```json
{
  "vars": {
    "CACHE_TTL_SECONDS": "300",
    "UMAMI_API_ENDPOINT": "https://analytics.example.com/api"
  }
}
```

### 部署顺序

这次做完功能之后，我自己梳理下来，最稳妥的顺序是：

#### 1. 先准备好站点里的公开变量

编辑根目录的 `.env`：

```dotenv
PUBLIC_UMAMI_SCRIPT_URL="https://cloud.umami.is/script.js"
PUBLIC_UMAMI_WEBSITE_ID="你的-website-id"
PUBLIC_UMAMI_STATS_API_URL="https://你的-worker.workers.dev/api/pageviews"
```

#### 2. 再配置 Worker 的 secrets

```bash
cd workers/umami-pageviews
```

Umami Cloud：

```bash
bunx wrangler secret put UMAMI_WEBSITE_ID
bunx wrangler secret put UMAMI_API_KEY
```

自托管 Umami：

```bash
bunx wrangler secret put UMAMI_WEBSITE_ID
bunx wrangler secret put UMAMI_BEARER_TOKEN
```

#### 3. 部署 Worker

如果允许路径有变化，先同步：

```bash
# 在仓库根目录执行
bun run pageviews:sync
```

然后部署：

```bash
cd workers/umami-pageviews
bunx wrangler deploy
```

#### 4. 重新构建和部署博客

这里有一个很容易忘的点：`import.meta.env` 是构建时读取的，不是运行时动态读取的。

所以你改了 `.env` 之后，必须重新构建：

```bash
# 在仓库根目录执行
bunx astro check
bun run build
```

如果你的博客部署在某个平台上，也要把这些 `PUBLIC_UMAMI_*` 变量同步配置到部署平台的环境变量里，否则线上仍然会是旧值。

### 验证方式

做完之后，我把验证分成两层：

#### 静态检查

```bash
bunx tsc -p workers/umami-pageviews/tsconfig.json
bunx astro check
bun run build
```

#### 运行时检查

打开一篇文章，观察这几个点：

1. 页面是否成功加载 Umami tracking script
2. 浏览器是否请求了 `/api/pageviews/blog/<slug>`
3. Worker 是否返回 `200`
4. 返回 JSON 是否类似：

```json
{
  "pageviews": 123,
  "path": "/blog/umami-cloudflare",
  "updatedAt": "..."
}
```

如果看到的是：

- `Pageview tracking is disabled.`：优先检查 `PUBLIC_UMAMI_STATS_API_URL`
- `Views N/A`：优先检查 Worker 返回值、Worker secrets、Umami 认证方式
- `NaN`：优先检查 stats API 返回结构是不是 `{ value, prev }`

## 总结

回过头看，这次“给博客加访问量统计”真正重要的不是某一行代码，而是下面这些判断：

- 页面埋点和页面展示是两回事
- 前端不能直接碰 Umami 管理 API
- Worker 很适合承担这一层私有到公开的转换

最开始我以为这只是一个“把统计数字放到页面上”的小功能，实际做完之后，它更像是一条完整的数据链路接入：从埋点、鉴权、代理、展示，到最后的调试和验证，每一层都得对得上。

不过也正因为走完了一遍，后面再加按钮点击统计、自定义事件或者项目页浏览量，路径就已经很清楚了。

## 参考

- Umami 项目主页：<https://umami.is/>
- Umami API 文档：<https://umami.is/docs/api>
- Umami 自托管 API 认证：<https://docs.umami.is/docs/api/authentication>
- Worker 说明文档：`workers/umami-pageviews/README.md`
