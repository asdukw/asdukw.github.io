import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

// 首页的收尾区块。之前这段内容和 Footer 重复（Footer 也显示名字、标语和这两个
// 链接），所以 Footer 同时被收敛成一行版权。
export function AboutBlock() {
	const { t } = useLang();

	return (
		<section className="border-t border-border/60 pt-8">
			<h2 className="text-sm font-semibold tracking-tight">
				{t.about.introTitle}
			</h2>
			<p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
				{t.about.intro2}
			</p>
			<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
				<a
					href={site.github}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-brand"
				>
					<GithubIcon className="h-4 w-4" />
					GitHub
				</a>
				<a
					href={`mailto:${site.mail}`}
					className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-brand"
				>
					<Mail className="h-4 w-4" />
					{site.mail}
				</a>
			</div>
		</section>
	);
}
