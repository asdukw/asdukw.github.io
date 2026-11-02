import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

// 文章读完之后的落款。之前正文下面直接就是评论区，中间没有任何「作者是谁」的
// 交代。
export function AuthorCard() {
	const { t } = useLang();

	return (
		<div className="flex items-start gap-3">
			<Avatar className="h-10 w-10 border border-border">
				<AvatarImage src={site.avatar} alt={site.name} />
				<AvatarFallback className="text-xs font-semibold">
					{site.name.slice(0, 1).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<div className="text-sm font-semibold">@{site.name}</div>
				<p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
					{t.about.intro2}
				</p>
				<a
					href={site.github}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
				>
					<GithubIcon className="h-3.5 w-3.5" />
					GitHub
				</a>
			</div>
		</div>
	);
}
