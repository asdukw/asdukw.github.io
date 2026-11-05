// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// 文档站独立部署在 Cloudflare Pages（项目名 asdukw-notes）。
// 正式域名确定后改这里的 site，sitemap / canonical 会跟着变。
export default defineConfig({
	site: 'https://asdukw-notes.pages.dev',
	integrations: [
		starlight({
			title: 'asdukw 笔记',
			description: '课程与技术笔记，按系列 / 章 / 讲组织。',
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
			// 侧栏结构：notes/ 下每个子目录是一个「系列」，系列内每个子目录是一「章」，
			// 章里的每个 .md 是一「讲」。autogenerate 按目录层级自动生成分组，
			// 所以新增系列/章节只需要新建目录和文件，不用改这里。
			sidebar: [
				{ label: '笔记', items: [{ autogenerate: { directory: 'notes' } }] },
				{ label: '写作指南', slug: 'guide' },
			],
		}),
	],
});
