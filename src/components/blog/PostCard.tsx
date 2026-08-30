import { Link } from "react-router";
import { Clock } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/i18n/LanguageContext";
import type { Post } from "@/lib/posts";
import { categoryPath, formatDate } from "@/lib/format";

export function PostCard({ post }: { post: Post }) {
  const { lang, t } = useLang();
  const to = `${categoryPath(post.category)}/${post.slug}`;

  return (
    <Link to={to} className="group block h-full">
      <Card className="flex h-full flex-col transition-colors group-hover:border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime} {t.common.minRead}
            </span>
          </div>
          <CardTitle className="text-lg leading-snug transition-colors group-hover:text-foreground">
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-1.5 pt-0">
          {post.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </CardFooter>
      </Card>
    </Link>
  );
}