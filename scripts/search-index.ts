// Build-time section extraction for search.
//
// The article HTML is already rendered by scripts/mdx.ts, and its h2/h3 ids are
// already collected into `toc`. So the section boundaries come from `toc` — we only
// need to slice the HTML at those headings and strip the markup.
//
// Output is plain data (no inverted index): the ranking index is built in the
// browser from src/lib/tokenize.ts, so the tokenizer stays the single source of
// truth instead of being frozen into a committed file.

import type { CompiledPost, Lang, TocItem } from "./mdx.ts";

export interface SearchSection {
	postId: number;
	lang: Lang;
	/** Heading id; absent for the article-level section (title/excerpt/tags). */
	anchor?: string;
	heading: string;
	text: string;
}

const ENTITIES: Record<string, string> = {
	nbsp: " ",
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	"#39": "'",
	"#x27": "'",
};

function decodeEntities(text: string): string {
	return text
		.replace(/&([a-z]+|#\d+|#x[0-9a-f]+);/gi, (match, name: string) => {
			const named = ENTITIES[name.toLowerCase()];
			if (named !== undefined) return named;
			const code = name.startsWith("#x")
				? Number.parseInt(name.slice(2), 16)
				: name.startsWith("#")
					? Number.parseInt(name.slice(1), 10)
					: Number.NaN;
			return Number.isFinite(code) ? String.fromCodePoint(code) : match;
		});
}

/** Strip tags, decode entities, collapse whitespace. */
function stripHtml(html: string): string {
	return (
		decodeEntities(html.replace(/<[^>]+>/g, " "))
			.replace(/\s+/g, " ")
			// Tags become spaces, which would leave " ，" in Chinese text.
			.replace(/\s+([，。、；：！？）】」』])/g, "$1")
			.trim()
	);
}

interface Cut {
	start: number;
	contentStart: number;
	anchor: string;
	heading: string;
}

function cutsOf(post: CompiledPost): Cut[] {
	const tocById = new Map<string, TocItem>(post.toc.map((item) => [item.id, item]));
	const cuts: Cut[] = [];

	// A fresh regex per call: a module-level lastIndex is a footgun across posts.
	for (const match of post.html.matchAll(/<h([23])\b([^>]*)>/gi)) {
		const attrs = match[2] ?? "";
		const anchor = /\bid="([^"]*)"/.exec(attrs)?.[1];
		if (!anchor) continue;
		const item = tocById.get(anchor);
		// Headings outside `toc` (h1, or h2 without an id) are not section starts.
		if (!item) continue;
		const start = match.index ?? 0;
		// Heading text is wrapped in an autolink by rehype-autolink-headings, so the
		// content starts after the closing tag, not after the opening one.
		const closeTag = `</h${(match[1] ?? "2").toLowerCase()}>`;
		const openEnd = start + match[0].length;
		const closeIndex = post.html.indexOf(closeTag, openEnd);
		cuts.push({
			start,
			contentStart: closeIndex === -1 ? openEnd : closeIndex + closeTag.length,
			anchor,
			heading: item.text,
		});
	}

	return cuts;
}

export function sectionsOf(post: CompiledPost): SearchSection[] {
	const cuts = cutsOf(post);
	const lead = stripHtml(post.html.slice(0, cuts[0]?.start ?? post.html.length));

	// The article-level section keeps the old `?q=` reach: title, excerpt and tags
	// were searchable before, and losing them would be a regression.
	const meta = [post.excerpt, post.tags.join(" "), lead]
		.filter((part) => part.length > 0)
		.join(" ");

	const sections: SearchSection[] = [
		{
			postId: post.id,
			lang: post.lang,
			heading: post.title,
			text: meta || post.title,
		},
	];

	for (let i = 0; i < cuts.length; i += 1) {
		const cut = cuts[i];
		if (!cut) continue;
		const end = cuts[i + 1]?.start ?? post.html.length;
		const text = stripHtml(post.html.slice(cut.contentStart, end));
		if (!text) continue;
		sections.push({
			postId: post.id,
			lang: post.lang,
			anchor: cut.anchor,
			heading: cut.heading,
			text,
		});
	}

	return sections;
}
