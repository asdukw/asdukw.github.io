import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Languages, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLang } from "@/i18n/LanguageContext";
import { site } from "@/lib/site";

const NAV = [
  { to: "/", key: "home", end: true },
  { to: "/blog", key: "blog", end: false },
  { to: "/tech", key: "tech", end: false },
  { to: "/projects", key: "projects", end: false },
  { to: "/about", key: "about", end: false },
] as const;

function navClass(isActive: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground"
  }`;
}

export function Header() {
  const { lang, t, toggleLang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            {site.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
              {t.nav[item.key]}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={toggleLang}
            aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
          >
            <Languages className="h-4 w-4" />
            {lang === "zh" ? "EN" : "中文"}
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="打开菜单">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b border-border/60 px-4 py-4">
                <SheetTitle className="text-left text-sm font-semibold">
                  {site.name}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`
                    }
                    onClick={() => setOpen(false)}
                  >
                    {t.nav[item.key]}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}