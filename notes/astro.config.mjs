// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

// 文档站独立部署在 Cloudflare Pages（项目名 asdukw-notes）。
// 正式域名确定后改这里的 site，sitemap / canonical 会跟着变。
export default defineConfig({
	site: 'https://asdukw-notes.pages.dev',
	// 站内链接预取，导航更快（Starlight/Astro 官方推荐的默认优化）。
	prefetch: { prefetchAll: true },
	integrations: [
		starlight({
			title: 'asdukw 笔记',
			description: '课程与技术笔记，按系列 / 章 / 讲组织。',
			// 和主站统一的配色 / 字体与少量质感修饰。
			customCss: ['./src/styles/fonts.css', './src/styles/custom.css'],
			// 侧栏只显示当前系列，其余系列收进底部切换入口（教学站常见做法）。
			components: {
				Sidebar: './src/components/Sidebar.astro',
				Pagination: './src/components/Pagination.astro',
			},
			// 用主站同款头像做标签页图标。
			favicon: '/favicon.png',
			// 每页底部显示「编辑此页」，指向本仓库对应文件。
			editLink: {
				baseUrl: 'https://github.com/asdukw/asdukw.github.io/edit/master/notes/',
			},
			// 显示每页最后更新时间（来自 git 历史，CI 需 fetch-depth: 0）。
			lastUpdated: true,
			// Starlight 默认不输出 og:image，这里给全站补一张分享卡片图。
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://asdukw-notes.pages.dev/og.png',
					},
				},
				{
					tag: 'meta',
					attrs: {
						name: 'twitter:image',
						content: 'https://asdukw-notes.pages.dev/og.png',
					},
				},
			],
			// 自定义 404 由 src/content/docs/404.md 提供，关掉内置 404 路由避免两条路由抢 /404。
			disable404Route: true,
			// 中文-only：root locale 的 lang 决定 <html lang>。
			// 以后要加英文，按 Starlight 的 locales 配置加一个 locale 目录即可。
			locales: {
				root: { label: '简体中文', lang: 'zh-CN' },
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/asdukw' },
			],
			// 侧栏结构：一个顶层分组 = 一个系列，系列下挂「概览」和若干「章」，章里每个 .md 是一「讲」。
			// 章节分组要显示中文的内容标题（而不是目录名 chapter-02），所以这里显式列出。
			// 新增系列：加一个顶层 { label, items: [...] }；新增章节：在对应系列下加一条
			// { label, items: [{ autogenerate: { directory } }] }。
			// 渲染时只显示当前系列，由下方 components 里的 Sidebar 覆盖实现。
			sidebar: [
				{
					label: 'Redis',
					items: [
						{ label: '概览', slug: 'notes/redis' },
						{
							label: 'Redis 中的数据类型',
							items: [{ autogenerate: { directory: 'notes/redis/chapter-02' } }],
						},
					],
				},
				{
					label: 'RocketMQ',
					items: [
						{ label: '概览', slug: 'notes/rocketmq' },
						{
							label: '架构与存储',
							items: [{ autogenerate: { directory: 'notes/rocketmq/chapter-01' } }],
						},
					],
				},
			],
		}),
		// 构建时校验站内链接和锚点，避免文档越写越多后出现死链。
		starlightLinksValidator(),
	],
});
