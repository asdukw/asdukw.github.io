import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFound() {
  const { t } = useLang();
  usePageTitle("404");

  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <p className="mt-3 text-sm text-muted-foreground">{t.list.empty}</p>
      <Button asChild variant="outline" size="sm" className="mt-8">
        <Link to="/">{t.nav.home}</Link>
      </Button>
    </div>
  );
}