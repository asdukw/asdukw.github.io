import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { site } from "@/lib/site";

// 文章读完之后的落款。只有头像、名字和入口：原来那句自我介绍和首页的文案重复，
// 已经删掉了。
export function AuthorCard() {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-10 w-10 border border-border">
				<AvatarImage src={site.avatar} alt={site.name} />
				<AvatarFallback className="text-xs font-semibold">
					{site.name.slice(0, 1).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<div className="flex items-center gap-2">
				<span className="text-sm font-semibold">@{site.name}</span>
				<a
					href={site.github}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand"
				>
					<GithubIcon className="h-3.5 w-3.5" />
					GitHub
				</a>
			</div>
		</div>
	);
}
