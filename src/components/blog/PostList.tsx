import { useMemo, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import { categoryInfo, getPosts, type Category } from "@/lib/posts";
import { PostCard } from "./PostCard";

export function PostList({
  category,
  showFilter = true,
}: {
  category: Category;
  showFilter?: boolean;
}) {
  const { lang, t } = useLang();
  const [tag, setTag] = useState<string | null>(null);

  const posts = useMemo(() => getPosts(category, lang), [category, lang]);
  const tags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags))).sort(),
    [posts],
  );
  const filtered = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  const info = categoryInfo(category);

  return (
    <div>
      {showFilter && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              tag === null
                ? "border-border bg-accent text-accent-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.all}
          </button>
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTag(item === tag ? null : item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                item === tag
                  ? "border-border bg-accent text-accent-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <p className="mb-4 text-xs text-muted-foreground">
        {t.list.total.replace("{count,number,integer}", String(filtered.length))} ·{" "}
        {info.name[lang]}
      </p>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((post) => (
            <PostCard key={post.key} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {t.list.empty}
        </p>
      )}
    </div>
  );
}