import { Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { ProjectsSection } from "@/components/about/ProjectsSection";
import { useLang } from "@/i18n/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { site } from "@/lib/site";

export function About() {
	const { lang, t } = useLang();
	usePageTitle(t.nav.about);

	return (
		<div className="max-w-2xl">
			<header className="flex items-center gap-4">
				<Avatar className="h-16 w-16 shrink-0 rounded-full border border-border">
					<AvatarImage src={site.avatar} alt={site.name} />
					<AvatarFallback className="rounded-full bg-primary text-lg font-bold text-primary-foreground">
						{site.name.slice(0, 1).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						{t.about.introTitle}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">@{site.name}</p>
				</div>
			</header>

			<p className="mt-6 text-base leading-relaxed">{site.description[lang]}</p>

			<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
				{t.about.intro1}
			</p>

			<Separator className="my-8" />

			<ProjectsSection />

			<Separator className="my-8" />

			<div>
				<h2 className="text-sm font-semibold">{t.about.contactTitle}</h2>
				<div className="mt-3 flex flex-col gap-2 text-sm">
					<a
						href={`mailto:${site.mail}`}
						className="inline-flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-brand"
					>
						<Mail className="h-4 w-4" />
						{site.mail}
					</a>
					<a
						href={site.github}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-brand"
					>
						<GithubIcon className="h-4 w-4" />
						{site.github}
					</a>
				</div>
			</div>
		</div>
	);
}
