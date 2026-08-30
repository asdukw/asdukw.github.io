import { posts as postIndex } from "@/generated/content";

export type Category = "blog" | "tech";
export type Lang = "zh" | "en";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface Post {
  key: string;
  category: Category;
  lang: Lang;
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  readingTime: number;
  html: string;
  toc: TocItem[];
}

export interface CategoryInfo {
  value: Category;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
}

export const CATEGORY_INFO: CategoryInfo[] = [
  {
    value: "blog",
    name: { zh: "随笔", en: "Journal" },
    description: {
      zh: "个人思考、读书观影与生活记录",
      en: "Thoughts, notes, and life in words",
    },
  },
  {
    value: "tech",
    name: { zh: "技术博客", en: "Tech Blog" },
    description: {
      zh: "踩坑记录、技术实践与工程心得",
      en: "Troubleshooting, practice, and engineering notes",
    },
  },
];

export function categoryInfo(category: Category): CategoryInfo {
  return CATEGORY_INFO.find((c) => c.value === category)!;
}

export function getPosts(category: Category, lang: Lang, limit?: number): Post[] {
  const posts = postIndex
    .filter((p) => p.category === category && p.lang === lang)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return limit ? posts.slice(0, limit) : posts;
}

export function getPost(category: Category, slug: string, lang: Lang): Post | undefined {
  return postIndex.find(
    (p) => p.category === category && p.slug === slug && p.lang === lang,
  );
}

export function getPostTranslations(category: Category, slug: string): Post[] {
  return postIndex.filter((p) => p.category === category && p.slug === slug);
}