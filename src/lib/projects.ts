import type { Lang } from "./posts";

export interface Project {
  name: string;
  tagline: Record<Lang, string>;
  description: Record<Lang, string>;
  tags: string[];
  url?: string;
  repo?: string;
  year: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    name: "asdukw.dev",
    tagline: {
      zh: "这个网站本身",
      en: "This very site",
    },
    description: {
      zh: "用 Bun + React 19 + shadcn/ui 搭建的个人网站，MDX 内容流水线，中英双语，GitHub Pages 静态部署。",
      en: "A personal site built with Bun + React 19 + shadcn/ui, an MDX content pipeline, bilingual, and statically deployed to GitHub Pages.",
    },
    tags: ["Bun", "React", "Tailwind", "TypeScript"],
    repo: "https://github.com/asdukw/asdukw.github.io",
    year: "2026",
    featured: true,
  },
  {
    name: "Template Drive",
    tagline: {
      zh: "项目模板收藏夹",
      en: "A library of project templates",
    },
    description: {
      zh: "收集常用项目模板，一键复制开箱即用，减少搭建脚手架的时间。",
      en: "A collection of ready-to-use project templates to skip the scaffolding stage.",
    },
    tags: ["TypeScript", "工具"],
    url: "https://github.com/asdukw",
    year: "2025",
  },
  {
    name: "Reading Notes",
    tagline: {
      zh: "读书笔记仓库",
      en: "Notes on what I read",
    },
    description: {
      zh: "用连续编号记录读过的书与摘录，慢慢积攒成一册个人书单。",
      en: "Sequential notes and quotes from the books I read, growing into a personal reading list.",
    },
    tags: ["写作", "Python"],
    url: "https://github.com/asdukw",
    year: "2024",
  },
];