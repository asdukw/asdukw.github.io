// 项目列表的唯一入口。页面只从这里取数据，不直接 import @/generated/projects
// （和 lib/posts.ts 同一个约定）：这样以后要给某几个仓库补中英文案、调顺序或者
// 藏掉某个 pin，改动都集中在本文件。
import { PROJECTS, type GeneratedProject } from "@/generated/projects";

export type Project = GeneratedProject;

export const projects: Project[] = PROJECTS;
