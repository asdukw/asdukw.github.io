/**
 * 首页用的内容索引：系列汇总 + 最近更新。
 *
 * 全部在构建期从 `src/content/docs/` 推导，新增系列 / 章节 / 讲后首页自动跟上，
 * 不需要再手改卡片文案或数量。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { getContentDates } from './git-dates';

type SeriesIcon = 'database' | 'rocket' | 'open-book' | 'document';

export interface SeriesSummary {
	id: string;
	title: string;
	description: string;
	href: string;
	icon: SeriesIcon;
	/** 章数（`chapter-*` 目录数）。 */
	chapters: number;
	/** 讲数（章节目录下的页面数，不含 index）。 */
	lessons: number;
	order: number;
}

export interface RecentNote {
	title: string;
	href: string;
	seriesTitle: string;
	/** 来自目录名 `chapter-NN`，没有章节归属时为空。 */
	chapter?: number;
	/** 是否为系列概览页。 */
	overview: boolean;
	/** 最后提交时间。 */
	date: Date;
}

/** 每个系列的图标；未登记的新系列回落到文档图标。 */
const SERIES_ICONS: Record<string, SeriesIcon> = {
	redis: 'database',
	rocketmq: 'rocket',
	ddia: 'open-book',
};

export async function getSeries(): Promise<SeriesSummary[]> {
	const entries = (await getCollection('docs')).filter(
		(entry) => entry.id.startsWith('notes/') && !entry.data.draft,
	);
	const groups = new Map<string, CollectionEntry<'docs'>[]>();

	for (const entry of entries) {
		const series = entry.id.split('/')[1];
		if (!series) continue;
		const group = groups.get(series) ?? [];
		group.push(entry);
		groups.set(series, group);
	}

	const series: SeriesSummary[] = [];
	for (const [id, group] of groups) {
		const overview = group.find((entry) => entry.id === `notes/${id}`);
		if (!overview) continue;

		const chapters = new Set<string>();
		let lessons = 0;
		for (const entry of group) {
			const match = entry.id.match(/^notes\/[^/]+\/(chapter-[^/]+)\/([^/]+)$/);
			if (!match) continue;
			chapters.add(match[1]);
			if (match[2] !== 'index') lessons++;
		}

		const { sidebar } = overview.data;
		series.push({
			id,
			title: overview.data.title,
			description: overview.data.description ?? '',
			href: `/${overview.id.replace(/\/index$/, '')}/`,
			icon: SERIES_ICONS[id] ?? 'document',
			chapters: chapters.size,
			lessons,
			order:
				typeof sidebar === 'number' ? sidebar : (sidebar?.order ?? Number.MAX_SAFE_INTEGER),
		});
	}

	return series.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/**
 * 最近更新的页面，按 git 最后提交时间倒序。
 * 构建环境没有 git 历史时返回空数组，首页据此隐藏该区块。
 */
export async function getRecentNotes(limit = 6): Promise<RecentNote[]> {
	const dates = getContentDates();
	if (dates.size === 0) return [];

	const [entries, series] = await Promise.all([getCollection('docs'), getSeries()]);
	const titles = new Map(series.map((item) => [item.id, item.title]));

	const notes: (RecentNote & { timestamp: number })[] = [];
	for (const entry of entries) {
		const timestamp = dates.get(entry.id);
		const seriesId = entry.id.split('/')[1];
		if (!entry.id.startsWith('notes/') || entry.data.draft || !timestamp || !seriesId) continue;

		const seriesTitle = titles.get(seriesId);
		if (!seriesTitle) continue;

		const chapter = entry.id.match(/\/chapter-(\d+)\//)?.[1];
		notes.push({
			title: entry.data.title,
			href: `/${entry.id.replace(/\/index$/, '')}/`,
			seriesTitle,
			chapter: chapter === undefined ? undefined : Number(chapter),
			overview: entry.id === `notes/${seriesId}`,
			date: new Date(timestamp),
			timestamp,
		});
	}

	notes.sort((a, b) => b.timestamp - a.timestamp || a.href.localeCompare(b.href));
	return notes.slice(0, limit);
}
