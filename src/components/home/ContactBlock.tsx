import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

// 首页的收尾区块。原本还带一句自我介绍，但那句和 Hero 副标题语意重复，已经删掉，
// 现在这里只负责给出联系入口；站点身份交给 Hero，Footer 只留版权。
export function ContactBlock() {
	const { t } = useLang();

	return (
		<section className="border-t border-border/60 pt-8">
			<h2 className="text-sm font-semibold tracking-tight">
				{t.about.contactTitle}
			</h2>
			<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
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
