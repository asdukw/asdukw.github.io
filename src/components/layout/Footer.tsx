import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

export function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <div>
            <div className="text-sm font-semibold">{site.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{site.tagline[lang]}</div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <GithubIcon />
            </a>
            <a
              href={`mailto:${site.mail}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>

          <div className="flex w-full max-w-md flex-col items-center gap-1 border-t border-border/40 pt-5 text-xs text-muted-foreground sm:items-start">
            <span>
              © {year} {site.name} · {t.footer.rights}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}