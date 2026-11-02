import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { projects } from "@/lib/projects";

// 项目是「关于」页的一个子章节，不再单独占一个路由。旧地址 /projects 在
// App.tsx 里重定向到 /about。
export function ProjectsSection() {
	const { lang, t } = useLang();

	return (
		<section>
			<h2 className="text-sm font-semibold">{t.nav.projects}</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				{t.about.projectsDescription}
			</p>

			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				{projects.map((project) => (
					<Card
						key={project.name}
						className={`flex h-full flex-col transition-colors hover:border-brand/40 ${
							project.featured ? "border-brand/30 sm:col-span-2" : ""
						}`}
					>
						<CardHeader className="pb-2">
							<div className="flex items-start justify-between gap-2">
								<div>
									<div className="flex items-center gap-2">
										<CardTitle
											className={project.featured ? "text-xl" : "text-lg"}
										>
											{project.name}
										</CardTitle>
										<span className="text-xs text-muted-foreground tabular-nums">
											{project.year}
										</span>
									</div>
									<p className="mt-1 text-sm font-medium text-muted-foreground">
										{project.tagline[lang]}
									</p>
								</div>
								{project.repo && (
									<a
										href={project.repo}
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground transition-colors hover:text-foreground"
										aria-label="Repository"
									>
										<GithubIcon className="h-4 w-4" />
									</a>
								)}
							</div>
						</CardHeader>
						<CardContent className="flex-1">
							<p className="text-sm leading-relaxed text-muted-foreground">
								{project.description[lang]}
							</p>
							<div className="mt-4 flex flex-wrap items-center gap-1.5">
								{project.tags.map((tag) => (
									<Badge key={tag} variant="secondary" className="font-normal">
										{tag}
									</Badge>
								))}
								{project.url && (
									<a
										href={project.url}
										target="_blank"
										rel="noopener noreferrer"
										className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand"
									>
										{t.common.visit}
										<ArrowUpRight className="h-3 w-3" />
									</a>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
