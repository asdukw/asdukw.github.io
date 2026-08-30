import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import { categoryInfo, type Category, type TocItem } from "@/lib/posts";

export function TOC({ toc, category }: { toc: TocItem[]; category: Category }) {
  const { lang } = useLang();
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  if (!toc.length) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 text-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {categoryInfo(category).name[lang]}
      </div>
      <ul className="space-y-1">
        {toc.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`w-full rounded-md px-3 py-1 text-left transition-colors ${
                item.id === activeId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ paddingLeft: `${0.75 + (item.level - 1) * 0.75}rem` }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}