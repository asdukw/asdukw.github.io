import type { Lang } from "./posts";

interface SiteConfig {
  name: string;
  tagline: Record<Lang, string>;
  description: Record<Lang, string>;
  github: string;
  mail: string;
  keywords: string[];
}

export const site: SiteConfig = {
  name: "asdukw",
  tagline: {
    zh: "记录代码与生活",
    en: "Coding and life, in writing",
  },
  description: {
    zh: "asdukw 的个人网站：随笔与技术博客。记录代码、阅读与生活。",
    en: "asdukw's personal site: journal and tech blog on code, reading, and life.",
  },
  github: "https://github.com/asdukw",
  mail: "hello@asdukw.dev",
  keywords: ["blog", "tech", "随笔", "技术博客", "React", "Bun", "TypeScript"],
};