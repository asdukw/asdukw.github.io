import { Hero } from "@/components/home/Hero";
import { RecentPosts } from "@/components/home/RecentPosts";
import { ContactBlock } from "@/components/home/ContactBlock";
import { usePageTitle } from "@/hooks/usePageTitle";

export function Home() {
	usePageTitle();
	return (
		<div className="space-y-14">
			<Hero />
			<RecentPosts />
			<ContactBlock />
		</div>
	);
}
