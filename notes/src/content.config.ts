import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// Starlight 的 UI 文案覆盖需要 i18n collection；不定义时构建会告警。
	// 目前没有覆盖文件，加载器会得到空集合。
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
