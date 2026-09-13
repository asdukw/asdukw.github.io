import { supabase } from "@/lib/supabase";
import type { Category, Lang, TocItem } from "@/lib/posts";

export interface EditablePost {
  category: Category;
  slug: string;
  publishedOn: string;
  isPublished: boolean;
  lang: Lang;
  title: string;
  excerpt: string;
  tags: string[];
  sourceMdx: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function slugifyHeading(value: string): string {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export function renderMdx(source: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const html = source.split(/\r?\n/).map((line) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const text = (heading[2] ?? "").trim();
      const id = slugifyHeading(text) || `heading-${toc.length + 1}`;
      toc.push({ id, text, level });
      return `<h${level} id="${escapeHtml(id)}">${escapeHtml(text)}</h${level}>`;
    }
    if (!line.trim()) return "";
    return `<p>${escapeHtml(line)}</p>`;
  }).join("\n");
  return { html, toc };
}

export async function loadEditablePost(category: Category, slug: string, lang: Lang): Promise<EditablePost | null> {
  const { data, error } = await supabase.from("posts").select(`category, slug, published_on, is_published, post_translations!inner(lang,title,excerpt,tags,source_mdx)`).eq("category", category).eq("slug", slug).eq("post_translations.lang", lang).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const translation = Array.isArray(data.post_translations) ? data.post_translations[0] : data.post_translations;
  if (!translation) return null;
  return { category: data.category as Category, slug: data.slug, publishedOn: data.published_on ?? new Date().toISOString().slice(0, 10), isPublished: data.is_published, lang, title: translation.title, excerpt: translation.excerpt, tags: translation.tags ?? [], sourceMdx: translation.source_mdx };
}

export async function saveEditablePost(post: EditablePost): Promise<void> {
  const rendered = renderMdx(post.sourceMdx);
  const { error } = await supabase.rpc("save_post_translation", {
    p_category: post.category, p_slug: post.slug, p_published_on: post.publishedOn,
    p_is_published: post.isPublished, p_lang: post.lang, p_title: post.title,
    p_excerpt: post.excerpt, p_tags: post.tags, p_source_mdx: post.sourceMdx,
    p_body_html: rendered.html, p_toc: rendered.toc,
  });
  if (error) throw error;
}
