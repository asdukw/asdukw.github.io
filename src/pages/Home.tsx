import { Hero } from "@/components/home/Hero";
import { RecentPosts } from "@/components/home/RecentPosts";
import { usePageTitle } from "@/hooks/usePageTitle";

export function Home() {
  usePageTitle();
  return (
    <div>
      <Hero />
      <RecentPosts category="blog" />
      <RecentPosts category="tech" />
    </div>
  );
}