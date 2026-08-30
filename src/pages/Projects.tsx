import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { projects } from "@/lib/projects";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowUpRight } from "lucide-react";

export function Projects() {
  const { lang, t } = useLang();
  usePageTitle(t.nav.projects);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t.nav.projects}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "zh"
            ? "我在业余时间做的一些东西。"
            : "A few things I've built in my spare time."}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Card
            key={project.name}
            className={`flex h-full flex-col transition-colors hover:border-border ${
              project.featured ? "sm:col-span-2" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{project.year}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {project.tagline[lang]}
                  </p>
                </div>
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Repository"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {project.description[lang]}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                ))}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {lang === "zh" ? "查看项目" : "Visit"}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}