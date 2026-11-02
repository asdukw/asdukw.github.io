import { ArrowUpRight, Clock, GitFork, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { useLang } from "@/i18n/LanguageContext";
import { projects } from "@/lib/projects";

// 项目是「关于」页的一个子章节，不再单独占一个路由。卡片内容直接来自 GitHub 上
// pin 的仓库（见 scripts/fetch-projects.ts），描述用仓库原文，所以这块是中英混排
// 的 —— 想要双语得在 lib/projects.ts 里加 override。
export function ProjectsSection() {
	const { t } = useLang();

	return (
		<section>
			<h2 className="text-sm font-semibold">{t.about.projectsTitle}</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				{t.about.projectsDescription}
			</p>

			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				{projects.map((project) => (
					<Card
						key={project.name}
						className="flex h-full flex-col transition-colors hover:border-brand/40"
					>
						<CardHeader className="pb-2">
							<div className="flex items-start justify-between gap-2">
								<CardTitle className="text-lg">
									<a
										href={project.url}
										target="_blank"
										rel="noopener noreferrer"
										className="transition-colors hover:text-brand"
									>
										{project.name}
									</a>
								</CardTitle>
								<a
									href={project.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground transition-colors hover:text-foreground"
									aria-label={project.name}
								>
									<GithubIcon className="h-4 w-4" />
								</a>
							</div>
						</CardHeader>

						<CardContent className="flex-1">
							{project.description && (
								<p className="text-sm leading-relaxed text-muted-foreground">
									{project.description}
								</p>
							)}

							<div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
								{project.language && <span>{project.language}</span>}
								{project.stars > 0 && (
									<span className="inline-flex items-center gap-1">
										<Star className="h-3 w-3" />
										{project.stars}
									</span>
								)}
								{project.forks > 0 && (
									<span className="inline-flex items-center gap-1">
										<GitFork className="h-3 w-3" />
										{project.forks}
									</span>
								)}
								<span className="inline-flex items-center gap-1">
									<Clock className="h-3 w-3" />
									<time dateTime={project.updated} className="tabular-nums">
										{t.common.updated} {project.updated}
									</time>
								</span>
								{project.homepageUrl && (
									<a
										href={project.homepageUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="ml-auto inline-flex items-center gap-1 transition-colors hover:text-brand"
									>
										{t.common.visit}
										<ArrowUpRight className="h-3 w-3" />
									</a>
								)}
							</div>

							{project.topics.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-1.5">
									{project.topics.map((topic) => (
										<Badge
											key={topic}
											variant="secondary"
											className="font-normal"
										>
											{topic}
										</Badge>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
