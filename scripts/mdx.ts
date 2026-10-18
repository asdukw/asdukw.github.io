// Shared MDX compiler for the content pipeline.
//
// Articles live as MDX files under src/content/ and are compiled to static HTML at
// build time by scripts/build-content.ts. Nothing compiles MDX in the browser:
// src/lib/posts.ts reads the generated data and hands the HTML to
// dangerouslySetInnerHTML.

import matter from "gray-matter";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { visit } from "unist-util-visit";
import { createElement, Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import type { Element, Root } from "hast";

export type Lang = "zh" | "en";

export interface TocItem {
	id: string;
	text: string;
	level: number;
}

export interface CompiledPost {
	id: number;
	lang: Lang;
	title: string;
	date: string;
	tags: string[];
	excerpt: string;
	readingTime: number;
	html: string;
	toc: TocItem[];
}

export function fail(message: string): never {
	console.error(`build-content: ${message}`);
	process.exit(1);
}

function textOf(node: Element): string {
	let text = "";
	visit(node, "text", (child) => {
		text += child.value;
	});
	return text.replace(/\s+/g, " ").trim();
}

// Collect h2/h3 anchors after rehype-slug has assigned ids. Deeper headings are
// intentionally left out: the site's table of contents only ever shows two levels.
function rehypeCollectToc(toc: TocItem[]) {
	return () => (tree: Root) => {
		visit(tree, "element", (node: Element) => {
			if (node.tagName !== "h2" && node.tagName !== "h3") return;
			const id = node.properties?.id;
			if (typeof id !== "string" || !id) return;
			toc.push({ id, text: textOf(node), level: Number(node.tagName.slice(1)) });
		});
	};
}

async function renderMdx(source: string): Promise<{ html: string; toc: TocItem[] }> {
	const toc: TocItem[] = [];

	const module = await evaluate(source, {
		remarkPlugins: [remarkGfm],
		rehypePlugins: [
			rehypeSlug,
			rehypeCollectToc(toc),
			// Wrap heading text in its own anchor, which is what .prose-article h2 > a styles.
			[rehypeAutolinkHeadings, { behavior: "wrap" }],
			rehypeHighlight,
		],
		Fragment,
		jsx,
		jsxs,
	});

	return { html: renderToStaticMarkup(createElement(module.default)), toc };
}

function readingTime(source: string): number {
	const words = source.trim().split(/\s+/).length;
	return Math.max(1, Math.ceil(words / 200));
}

function readString(data: Record<string, unknown>, key: string, file: string): string {
	const value = data[key];
	if (typeof value !== "string" || !value.trim()) {
		fail(`${file}: frontmatter "${key}" must be a non-empty string`);
	}
	return value.trim();
}

export async function compilePost(file: string): Promise<CompiledPost> {
	const raw = await Bun.file(file).text();
	const parsed = matter(raw);
	const data = parsed.data as Record<string, unknown>;

	const id = data.id;
	if (!Number.isSafeInteger(id) || (id as number) < 1) {
		fail(`${file}: frontmatter "id" must be a positive integer`);
	}

	const lang = data.lang;
	if (lang !== "zh" && lang !== "en") {
		fail(`${file}: frontmatter "lang" must be "zh" or "en"`);
	}

	const date = readString(data, "date", file);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		fail(`${file}: frontmatter "date" must look like 2026-08-28`);
	}

	const title = readString(data, "title", file);
	const excerpt = typeof data.excerpt === "string" ? data.excerpt.trim() : "";
	const tags = Array.isArray(data.tags)
		? data.tags.filter((tag): tag is string => typeof tag === "string")
		: [];

	const body = parsed.content.trim();
	if (!body) fail(`${file}: no content below the frontmatter`);

	const { html, toc } = await renderMdx(body);
	if (!html.trim()) fail(`${file}: compiled MDX produced empty HTML`);

	return {
		id: id as number,
		lang,
		title,
		date,
		tags,
		excerpt,
		readingTime: readingTime(body),
		html,
		toc,
	};
}
