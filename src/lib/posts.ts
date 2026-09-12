import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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

interface PostTranslationRow {
  lang: unknown;
  title: unknown;
  excerpt: unknown;
  tags: unknown;
  reading_time: unknown;
  body_html: unknown;
  toc: unknown;
}

interface PostRow {
  category: unknown;
  slug: unknown;
  published_on: unknown;
  post_translations: PostTranslationRow[] | PostTranslationRow | null;
}

interface PostIndexState {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

let cachedPosts: Post[] | null = null;
let pendingPosts: Promise<Post[]> | null = null;

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error("Unable to load posts from Supabase.");
}

function toCategory(value: unknown): Category | null {
  return value === "blog" || value === "tech" ? value : null;
}

function toLang(value: unknown): Lang | null {
  return value === "zh" || value === "en" ? value : null;
}

function toTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toToc(value: unknown): TocItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const text = typeof record.text === "string" ? record.text : "";
    const level = Number(record.level);
    if (!id || !text || !Number.isInteger(level) || level < 1 || level > 6) {
      return [];
    }
    return [{ id, text, level }];
  });
}

function toTranslations(
  value: PostTranslationRow[] | PostTranslationRow | null,
): PostTranslationRow[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizePosts(rows: PostRow[]): Post[] {
  return rows.flatMap((row) => {
    const category = toCategory(row.category);
    const slug = typeof row.slug === "string" ? row.slug : "";
    const date = typeof row.published_on === "string" ? row.published_on : "";

    if (!category || !slug || !date) return [];

    return toTranslations(row.post_translations).flatMap((translation) => {
      const lang = toLang(translation.lang);
      const title = typeof translation.title === "string" ? translation.title : "";
      const html = typeof translation.body_html === "string" ? translation.body_html : "";

      if (!lang || !title || !html) return [];

      const readingTime = Number(translation.reading_time);
      return [
        {
          key: `${category}/${slug}.${lang}`,
          category,
          lang,
          slug,
          title,
          date,
          tags: toTags(translation.tags),
          excerpt:
            typeof translation.excerpt === "string" ? translation.excerpt : "",
          readingTime: Number.isFinite(readingTime) ? Math.max(1, readingTime) : 1,
          html,
          toc: toToc(translation.toc),
        },
      ];
    });
  });
}

async function loadPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        category,
        slug,
        published_on,
        post_translations (
          lang,
          title,
          excerpt,
          tags,
          reading_time,
          body_html,
          toc
        )
      `,
    )
    .eq("is_published", true)
    .order("published_on", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return normalizePosts((data ?? []) as unknown as PostRow[]);
}

async function fetchPosts(): Promise<Post[]> {
  if (cachedPosts) return cachedPosts;
  if (pendingPosts) return pendingPosts;

  pendingPosts = loadPosts();
  try {
    cachedPosts = await pendingPosts;
    return cachedPosts;
  } finally {
    pendingPosts = null;
  }
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder || a.key.localeCompare(b.key);
  });
}

function selectPosts(
  posts: Post[],
  category: Category,
  lang: Lang,
  limit?: number,
): Post[] {
  const filtered = sortPosts(
    posts.filter((post) => post.category === category && post.lang === lang),
  );
  return limit === undefined ? filtered : filtered.slice(0, limit);
}

export async function getPosts(
  category: Category,
  lang: Lang,
  limit?: number,
): Promise<Post[]> {
  return selectPosts(await fetchPosts(), category, lang, limit);
}

export async function getPost(
  category: Category,
  slug: string,
  lang: Lang,
): Promise<Post | undefined> {
  return (await getPosts(category, lang)).find((post) => post.slug === slug);
}

export async function getPostTranslations(
  category: Category,
  slug: string,
): Promise<Post[]> {
  return sortPosts(
    (await fetchPosts()).filter(
      (post) => post.category === category && post.slug === slug,
    ),
  );
}

function usePostIndex(): PostIndexState {
  const [posts, setPosts] = useState<Post[]>(() => cachedPosts ?? []);
  const [loading, setLoading] = useState(() => cachedPosts === null);
  const [error, setError] = useState<Error | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPosts()
      .then((loadedPosts) => {
        if (!active) return;
        setPosts(loadedPosts);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(asError(loadError));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  const retry = useCallback(() => {
    cachedPosts = null;
    pendingPosts = null;
    setRequestKey((key) => key + 1);
  }, []);

  return { posts, loading, error, retry };
}

export function useAllPosts(): PostIndexState {
  return usePostIndex();
}

export function usePosts(
  category: Category,
  lang: Lang,
  limit?: number,
): PostIndexState {
  const state = usePostIndex();
  const posts = useMemo(
    () => selectPosts(state.posts, category, lang, limit),
    [category, lang, limit, state.posts],
  );
  return { ...state, posts };
}

export function categoryInfo(category: Category): CategoryInfo {
  return CATEGORY_INFO.find((c) => c.value === category)!;
}
