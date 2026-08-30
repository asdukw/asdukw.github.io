import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";
import avatarUrl from "@/assets/avatar.jpg";

export function Hero() {
  const { lang, t } = useLang();

  return (
    <section className="flex flex-col items-start gap-8 py-8 sm:flex-row sm:items-center sm:py-12">
<Avatar className="h-24 w-24 shrink-0 rounded-full border border-border">
          <AvatarImage src={avatarUrl} alt={site.name} />
          <AvatarFallback className="rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {site.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.home.greeting}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {site.name}
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t.home.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/blog">{t.nav.blog}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/tech">{t.nav.tech}</Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="GitHub">
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              <GithubIcon />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}