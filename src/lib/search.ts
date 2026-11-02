// Article search: an inverted index built in the browser from the sections that
// scripts/search-index.ts derived at build time.
//
// Nothing here hits the network. The corpus is the three articles that are already
// in the bundle, so the index is built once on first query (19 sections, a few ms)
// and reused afterwards.
//
// Ranking index = MiniSearch, tokenizer = src/lib/tokenize.ts. The tokenizer must
// stay the single source of truth: the index and the query go through the same
// function, otherwise Chinese queries silently stop matching.

import MiniSearch from "minisearch";
import { SECTIONS } from "@/generated/search";
import { getPosts, type Lang, type Post } from "@/lib/posts";
import { tokenize } from "@/lib/tokenize";

interface Doc {
	id: string;
	postId: number;
	lang: Lang;
	anchor?: string;
	heading: string;
	text: string;
}

export interface SearchHit {
	post: Post;
	/** Text around the match, with ellipses. Always contains a query term (or its token). */
	snippet: string;
}

const SNIPPET_BEFORE = 40;
const SNIPPET_AFTER = 60;

/** Longest term first: it gives the most specific window around the match. */
function snippetOf(text: string, terms: string[]): string {
	const haystack = text.toLowerCase();
	const bySpecificity = [...terms].sort((a, b) => b.length - a.length);

	let at = -1;
	for (const term of bySpecificity) {
		const found = haystack.indexOf(term.toLowerCase());
		if (found !== -1) {
			at = found;
			break;
		}
	}

	if (at === -1) {
		// Matched through a prefix or a stored field we cannot locate: show the head.
		const head = text.slice(0, SNIPPET_BEFORE + SNIPPET_AFTER);
		return head.length < text.length ? `${head}…` : head;
	}

	const start = Math.max(0, at - SNIPPET_BEFORE);
	const end = Math.min(text.length, at + SNIPPET_AFTER);
	return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

let cachedIndex: MiniSearch<Doc> | undefined;

function searchIndex(): MiniSearch<Doc> {
	if (cachedIndex) return cachedIndex;

	const docs: Doc[] = SECTIONS.map((section, index) => ({
		id: String(index),
		postId: section.postId,
		lang: section.lang,
		...(section.anchor === undefined ? {} : { anchor: section.anchor }),
		heading: section.heading,
		text: section.text,
	}));

	const index = new MiniSearch<Doc>({
		fields: ["heading", "text"],
		storeFields: ["postId", "lang", "anchor", "text"],
		tokenize,
		searchOptions: {
			// A title hit outranks a body hit; `heading` also carries the meta section.
			boost: { heading: 4, text: 1 },
			prefix: true,
			fuzzy: false,
		},
	});
	index.addAll(docs);

	cachedIndex = index;
	return index;
}

/**
 * Full-text search restricted to the article versions shown for `lang`.
 *
 * Returns `undefined` for a blank query: the caller then renders the plain list
 * instead of an empty result set. Language handling is not re-implemented here —
 * `getPosts(lang)` already picks one version per article (interface language, then
 * `FALLBACK_LANG`), and a section only counts if its body language matches that
 * choice. That is what keeps both translations from showing up twice.
 */
export function searchPosts(query: string, lang: Lang): SearchHit[] | undefined {
	const trimmed = query.trim();
	if (!trimmed) return undefined;

	const posts = getPosts(lang);
	const byId = new Map(posts.map((post) => [post.id, post]));
	const terms = tokenize(trimmed);

	// Best section per article: the list is article-level, the evidence is section-level.
	const best = new Map<number, { score: number; text: string }>();
	for (const result of searchIndex().search(trimmed)) {
		const doc = result as unknown as Doc & { score: number };
		const post = byId.get(doc.postId);
		if (!post || post.lang !== doc.lang) continue;

		const current = best.get(doc.postId);
		if (!current || doc.score > current.score) {
			best.set(doc.postId, { score: doc.score, text: doc.text });
		}
	}

	return posts
		.filter((post) => best.has(post.id))
		.sort((a, b) => (best.get(b.id)?.score ?? 0) - (best.get(a.id)?.score ?? 0))
		.map((post) => ({
			post,
			snippet: snippetOf(best.get(post.id)?.text ?? post.excerpt, terms),
		}));
}
