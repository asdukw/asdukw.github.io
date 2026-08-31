import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Languages, LogOut, Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { site } from "@/lib/site";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { GithubIcon } from "@/components/icons/GithubIcon";
import avatarUrl from "@/assets/avatar.jpg";

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

function UserButton() {
  const { user, loading, isAdmin, login, logout } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <Button variant="ghost" size="icon-sm" disabled>
        <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={login}>
        <GithubIcon className="h-4 w-4" />
        {t.auth.signIn}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full">
          <Avatar size="sm">
            <AvatarImage src={user.avatar_url} alt={user.login} />
            <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-none">{user.name || user.login}</span>
            <span className="text-xs leading-none text-muted-foreground">@{user.login}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem disabled>
            <Shield className="h-4 w-4" />
            {t.auth.admin}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4" />
          {t.auth.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileUserButton() {
  const { user, loading, login } = useAuth();
  const { t } = useLang();

  if (loading) return null;

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={login}>
        <GithubIcon className="h-4 w-4" />
        {t.auth.signIn}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2">
      <Avatar size="sm">
        <AvatarImage src={user.avatar_url} alt={user.login} />
        <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{user.name || user.login}</span>
    </div>
  );
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
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground text-xs font-bold">
            <img src={avatarUrl} alt={site.name} className="h-full w-full object-cover" />
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
          <ThemeSwitcher />
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

          <div className="hidden md:block">
            <UserButton />
          </div>

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
              <div className="border-t border-border/60 p-2">
                <MobileUserButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
