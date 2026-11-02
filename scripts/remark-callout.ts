// Turn GitHub alert blockquotes into static callout markup.
//
//   > [!WARNING]
//   > 课程资料版权归学校和各位老师所有。
//
// becomes
//
//   <div class="callout callout-warning">
//     <p class="callout-title">警告</p>
//     <p>课程资料版权归学校和各位老师所有。</p>
//   </div>
//
// This has to be a remark plugin, not a React component: scripts/mdx.ts compiles
// with `evaluate` and renders to a static string, so there is no component scope
// and nothing to hydrate (docs/CONTENT.md says the same).
//
// The marker is stripped at the mdast level and the container is retyped through
// `data.hName`, which remark-rehype honours. Content nodes (paragraphs, lists,
// code) are left untouched, so multi-paragraph callouts keep their structure.
//
// The title is a real text node, not CSS `::before`: it stays copyable, findable
// with in-page search, and lands in the search index built by
// scripts/search-index.ts.

import { visit } from "unist-util-visit";
import type { Blockquote, Paragraph, Root } from "mdast";

export type CalloutKind = "note" | "tip" | "important" | "warning" | "caution";

/** The article body language (`lang` frontmatter), not the interface language. */
export type CalloutLang = "zh" | "en";

const TITLES: Record<CalloutKind, Record<CalloutLang, string>> = {
	note: { zh: "注意", en: "Note" },
	tip: { zh: "提示", en: "Tip" },
	important: { zh: "重要", en: "Important" },
	warning: { zh: "警告", en: "Warning" },
	caution: { zh: "小心", en: "Caution" },
};

/**
 * The marker must be the first thing on the blockquote's first line. It is followed
 * by either a soft line break (react-markdown/rehype keep it inside one text node)
 * or the end of that text, so `> [!NOTE] 备注` (same line) deliberately does not match.
 */
const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;

function markerOf(paragraph: Paragraph): { kind: CalloutKind; rest: string } | undefined {
	const head = paragraph.children[0];
	if (!head || head.type !== "text") return undefined;

	const matched = MARKER.exec(head.value);
	if (!matched) return undefined;

	return {
		kind: matched[1]?.toLowerCase() as CalloutKind,
		rest: head.value.slice(matched[0].length),
	};
}

export function remarkCallout(lang: CalloutLang) {
	return (tree: Root): void => {
		// Collect first, then rewrite: mutating `children` inside a visit invalidates
		// the traversal index, and the next sibling reads back as undefined.
		const blocks: Blockquote[] = [];
		visit(tree, "blockquote", (node: Blockquote) => {
			blocks.push(node);
		});

		for (const node of blocks) {
			const first = node.children[0];
			if (!first || first.type !== "paragraph") continue;

			const marker = markerOf(first);
			if (!marker) continue;

			// Drop the marker itself, keep whatever followed it on later lines.
			const [, ...tail] = first.children;
			first.children = marker.rest
				? [{ type: "text", value: marker.rest }, ...tail]
				: tail;
			if (first.children.length === 0) node.children.shift();

			// Put the title in the marker's place. A callout with no body keeps its
			// title rather than becoming an empty block.
			const title: Paragraph = {
				type: "paragraph",
				data: { hName: "p", hProperties: { className: ["callout-title"] } },
				children: [{ type: "text", value: TITLES[marker.kind][lang] }],
			};
			node.children.unshift(title);

			node.data = {
				...node.data,
				hName: "div",
				hProperties: {
					...node.data?.hProperties,
					className: ["callout", `callout-${marker.kind}`],
				},
			};
		}
	};
}
