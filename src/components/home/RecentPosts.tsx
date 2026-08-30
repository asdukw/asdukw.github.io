import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { categoryInfo, getPosts, type Category } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";
import { categoryPath } from "@/lib/format";

export function RecentPosts({ category, limit = 3 }: { category: Category; limit?: number }) {
  const { lang, t } = useLang();
  const posts = getPosts(category, lang, limit);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {category === "blog" ? t.home.recentJournal : t.home.recentTech}
        </h2>
        <Link
          to={categoryPath(category)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.home.viewAll}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {posts.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.key} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {categoryInfo(category).description[lang]}
        </p>
      )}
    </section>
  );
}