# Mono Lume

Mono Lume 是一个基于 Astro 的个人作品集与博客站点。站点级配置集中在 `src/consts.ts`，长内容维护在 `src/content/`，并内置了一套内容 CLI 来简化新建、检查和批量维护 Markdown 文件。

## 技术栈

- Astro
- TypeScript
- Tailwind CSS
- Bun

## 快速开始

安装依赖并启动本地开发环境：

```bash
bun install
bun run dev
```

启动后访问 `http://localhost:4321`。

常用命令：

| Command                                                  | Action                             |
| :------------------------------------------------------- | :--------------------------------- |
| `bun run dev`                                            | 启动本地开发服务器                 |
| `bun run build`                                          | 构建静态站点到 `dist/`             |
| `bun run preview`                                        | 本地预览构建结果                   |
| `bun run content:new`                                    | 交互式新建 blog/project 内容       |
| `bun run content:check`                                  | 检查内容 frontmatter 和文件命名    |
| `bun run content:patch -- --type blog --set draft=false` | 按 collection 批量修改 frontmatter |

## 内容工作流

### 内容目录

- 博客文章：`src/content/blog/`
- 项目内容：`src/content/projects/`
- 内容 schema：`src/content.config.ts`

### 新建内容

推荐直接使用交互式脚手架：

```bash
bun run content:new
```

也支持最小参数模式：

```bash
bun run content:new -- --type blog --title "Astro Content Workflow"
bun run content:new -- --type projects --title "Form Builder" --slug form-builder
```

说明：

- 默认只要求最少输入，不强迫你在终端里写完整 `description` 或很多 `tags`
- `slug` 不传时会自动从标题推导
- 如果标题是纯中文或不适合自动转 slug，建议手动传 `--slug`
- 默认生成 `.md` 文件；如需 MDX，可传 `--format mdx`
- Blog 模板会直接生成 `tags: []`、`series: ""` 和 `image.url` / `image.alt` 的默认 frontmatter

### 检查内容

在提交前建议运行：

```bash
bun run content:check
```

它会检查：

- frontmatter 是否存在
- 必填字段是否缺失
- 字段类型是否明显异常
- 文件名 slug 是否符合小写连字符风格

### 批量修改 frontmatter

第一版 `patch` 只支持按 collection 全量修改：

```bash
bun run content:patch -- --type blog --set draft=true
bun run content:patch -- --type blog --set series="Astro Notes"
bun run content:patch -- --type projects --set image.url="/default-cover.webp"
```

如果要删除字段，可以传 `null`：

```bash
bun run content:patch -- --type projects --set githubUrl=null
```

## 关键目录

```text
.
├── public/                  # 静态资源
├── scripts/content/         # 内容 CLI
├── src/
│   ├── components/          # 站点组件
│   ├── content/
│   │   ├── blog/            # 博客文章
│   │   └── projects/        # 项目内容
│   ├── pages/               # 路由页面
│   ├── styles/              # 全局样式
│   ├── consts.ts            # 站点配置
│   └── content.config.ts    # 内容 schema
├── BLOG_CUSTOMIZATION.md    # 详细维护说明
└── package.json
```

## 常见修改入口

- `src/consts.ts`：站点标题、描述、邮箱、社交链接
- `src/content/blog/`：博客文章内容
- `src/content/projects/`：项目详情内容
- `public/`：封面图、头像、favicon 等静态资源
- `src/components/`：导航、首页、关于、联系、页脚等界面文案

## 详细维护说明

如果你需要逐文件的修改说明、frontmatter 字段示例、页面定制说明和发布前检查清单，请看 [BLOG_CUSTOMIZATION.md](./BLOG_CUSTOMIZATION.md)。
