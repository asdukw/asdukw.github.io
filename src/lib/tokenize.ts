// CJK-aware tokenizer shared by the search index and the queries.
//
// Chinese has no spaces, so whitespace splitting (what lunr does by default) turns
// a whole paragraph into a single token. Intl.Segmenter is not a substitute either:
// measured on this machine it only reaches partial word granularity ("课件" splits
// into "课" | "件"), and its output drifts with the ICU version, so the build and
// the browser could disagree.
//
// Instead: a CJK run becomes overlapping bigrams, a latin/digit run stays one
// lowercase word. No dictionary, no dependency, deterministic everywhere.
//
//   "把课件下载到本地 due.md"  ->  把课 课件 件下 下载 载到 到本 本地  due.md
//
// Both the index and the query go through this one function; there is no second
// implementation to drift.

/** CJK Unified Ideographs (+ Extension A, + Compatibility Ideographs). */
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** Characters that stay together as one latin/digit token. */
const WORD = /[0-9a-z._+-]/i;

/** A latin token must carry at least one letter or digit: a lone `+` is noise. */
const ALNUM = /[0-9a-z]/i;

export function tokenize(text: string): string[] {
	const tokens: string[] = [];
	let buffer = "";
	let bufferIsHan = false;

	const flush = () => {
		if (!buffer) return;
		if (bufferIsHan) {
			// A single character is its own token; otherwise every adjacent pair.
			if (buffer.length === 1) tokens.push(buffer);
			else {
				for (let i = 0; i < buffer.length - 1; i += 1) {
					tokens.push(buffer.slice(i, i + 2));
				}
			}
		} else {
			// Strip surrounding punctuation so `--headed` and `headed` are one token.
			const word = buffer.replace(/^[._+-]+|[._+-]+$/g, "");
			if (ALNUM.test(word)) tokens.push(word.toLowerCase());
		}
		buffer = "";
	};

	for (const char of text) {
		if (HAN.test(char)) {
			if (!bufferIsHan) {
				flush();
				bufferIsHan = true;
			}
			buffer += char;
		} else if (WORD.test(char)) {
			if (bufferIsHan) {
				flush();
				bufferIsHan = false;
			}
			buffer += char;
		} else {
			// Punctuation, whitespace, emoji: token boundary.
			flush();
			bufferIsHan = false;
		}
	}
	flush();

	return tokens;
}
