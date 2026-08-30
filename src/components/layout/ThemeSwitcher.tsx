import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLang } from "@/i18n/LanguageContext";
import { useTheme, type ThemeMode } from "@/lib/ThemeContext";

const OPTIONS: { value: ThemeMode; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  const { t } = useLang();
  const ActiveIcon = OPTIONS.find((o) => o.value === mode)!.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t.theme.switch}>
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as ThemeMode)}
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <Icon className="size-4" />
                {t.theme[option.value]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}