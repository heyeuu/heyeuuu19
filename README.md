# Mono Lume

个人作品集与博客站点 → [me.heyeuuu19.com](https://me.heyeuuu19.com)

## 本地运行

```bash
bun install
bun run dev
```

## 添加博客

在 `src/content/blog/` 下创建 Markdown 文件：

```yaml
---
title: "文章标题"
description: "摘要"
date: "2026-05-31"
draft: true
tags: []
image:
  url: "/cover.webp"
  alt: "封面图说明"
---
```

正文内容...

将 `draft` 改为 `false` 即可发布。

## 修改站点信息

编辑 `src/consts.ts`，可配置：

- 站点标题、描述、OG 图
- 社交链接
- 首页、关于页文案

## 部署

构建后将 `dist/` 部署到任意静态托管服务：

```bash
bun run build
```
