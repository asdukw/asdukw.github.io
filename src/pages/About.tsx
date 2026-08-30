import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLang } from "@/i18n/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { site } from "@/lib/site";

const SKILLS = ["TypeScript", "React", "Bun", "Node.js", "Python", "SQL", "Git", "Docker"];
const INTERESTS = ["阅读", "写作", "开源", "烹饪", "旅行", "摄影"];

export function About() {
  const { lang, t } = useLang();
  usePageTitle(t.nav.about);

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t.about.introTitle}</h1>
      </header>

      <p className="text-base leading-relaxed">{site.description[lang]}</p>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {t.about.intro1}
        <br />
        {t.about.intro2}
      </p>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.about.skillsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t.about.interestsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <div>
        <h2 className="text-base font-semibold">{t.about.contactTitle}</h2>
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          <a
            href={`mailto:${site.mail}`}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {site.mail}
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {site.github}
          </a>
        </div>
      </div>
    </div>
  );
}