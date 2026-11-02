import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

// 一行到底。站点身份（名字、标语、联系方式）已经交给 Hero 和首页的关于区块，
// Footer 只留版权和入口，不再重复一遍。
export function Footer() {
	const { t } = useLang();
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-border/60">
			<div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
				<span>
					© {year} {site.name} · {t.footer.rights}
				</span>
				<div className="flex items-center gap-1">
					<a
						href={site.github}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground"
						aria-label="GitHub"
					>
						<GithubIcon />
					</a>
					<a
						href={`mailto:${site.mail}`}
						className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground"
						aria-label="Email"
						title={site.mail}
					>
						<Mail className="h-4 w-4" />
					</a>
				</div>
			</div>
		</footer>
	);
}
