/**
 * 构建期读取内容文件在 git 里的最后提交时间。
 *
 * 首页「最近更新」按真实提交时间排序，比 frontmatter 里手写日期可靠。
 * 只跑一次 `git log`（而不是每个文件一次）。
 * 没有 git（例如从 tarball 构建）时返回空 Map，调用方自行降级。
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { srcDir } from 'astro:config/server';

/** `src/content/docs/` 的绝对路径；用 Astro 的 srcDir，构建 / dev 都成立。 */
const docsDir = fileURLToPath(new URL('content/docs/', srcDir));

/**
 * @returns 内容 id（相对 `src/content/docs/`、无扩展名、`/` 分隔）→ 最后提交时间戳（毫秒）。
 */
export function getContentDates(): Map<string, number> {
	const dates = new Map<string, number>();

	try {
		const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
			cwd: docsDir,
			encoding: 'utf8',
		}).trim();

		const log = execFileSync(
			'git',
			['-c', 'core.quotepath=false', 'log', '--format=t:%ct', '--name-only', '-z', '--', '.'],
			{ cwd: docsDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
		);

		let timestamp = 0;
		for (const raw of log.split('\0')) {
			const entry = raw.replace(/^\n/, '');
			if (!entry) continue;
			if (entry.startsWith('t:')) {
				timestamp = Number(entry.slice(2)) * 1000;
				continue;
			}
			// git 输出的路径相对仓库根目录，换算成内容 id；index 页的 id 不带 /index。
			const relative = path
				.relative(docsDir, path.resolve(repoRoot, entry))
				.split(path.sep)
				.join('/');
			const id = relative.replace(/\.[^./]+$/, '').replace(/\/index$/, '');
			const previous = dates.get(id) ?? 0;
			if (timestamp > previous) dates.set(id, timestamp);
		}
	} catch {
		// 没有 git 或不是仓库：返回空 Map，首页隐藏「最近更新」。
	}

	return dates;
}
