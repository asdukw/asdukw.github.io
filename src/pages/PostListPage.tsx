import { Separator } from "@/components/ui/separator";
import { PostList } from "@/components/blog/PostList";
import { useLang } from "@/i18n/LanguageContext";
import { POST_INFO } from "@/lib/posts";
import { usePageTitle } from "@/hooks/usePageTitle";

export function PostListPage() {
	const { lang } = useLang();
	const info = POST_INFO;
	usePageTitle(info.name[lang]);

	return (
		<div>
			<header className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">{info.name[lang]}</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{info.description[lang]}
				</p>
			</header>
			<Separator className="mb-6" />
			<PostList />
		</div>
	);
}
