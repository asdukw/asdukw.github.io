import { useEffect } from "react";
import { site } from "@/lib/site";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : site.name;
  }, [title]);
}