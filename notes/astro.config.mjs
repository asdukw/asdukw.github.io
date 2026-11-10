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
				{
					label: 'DDIA',
					items: [
						{ label: '概览', slug: 'notes/ddia' },
						{
							label: '第 1 章 · 数据系统架构中的权衡',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-01' } }],
						},
						{
							label: '第 2 章 · 定义非功能性需求',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-02' } }],
						},
						{
							label: '第 3 章 · 数据模型与查询语言',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-03' } }],
						},
						{
							label: '第 4 章 · 存储与检索',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-04' } }],
						},
						{
							label: '第 5 章 · 编码与演化',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-05' } }],
						},
						{ label: '第二部分 · 分布式数据', slug: 'notes/ddia/part-ii' },
						{
							label: '第 6 章 · 复制',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-06' } }],
						},
						{
							label: '第 7 章 · 分片',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-07' } }],
						},
						{
							label: '第 8 章 · 事务',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-08' } }],
						},
						{
							label: '第 9 章 · 分布式系统的麻烦',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-09' } }],
						},
						{
							label: '第 10 章 · 一致性与共识',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-10' } }],
						},
						{ label: '第三部分 · 衍生数据', slug: 'notes/ddia/part-iii' },
						{
							label: '第 11 章 · 批处理',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-11' } }],
						},
						{
							label: '第 12 章 · 流处理',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-12' } }],
						},
						{
							label: '第 13 章 · 流式系统的哲学',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-13' } }],
						},
						{
							label: '第 14 章 · 做正确的事情',
							items: [{ autogenerate: { directory: 'notes/ddia/chapter-14' } }],
						},
					],
				},
			],
		}),
		// 构建时校验站内链接和锚点，避免文档越写越多后出现死链。
		starlightLinksValidator(),
	],
});
