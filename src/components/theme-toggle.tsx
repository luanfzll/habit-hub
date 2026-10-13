"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "system", Icon: MonitorIcon },
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
] as const;

/** System, light or dark. The choice is only known in the browser, so the server renders it unselected. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <ToggleGroup
      aria-label={t("label")}
      size="sm"
      spacing={0}
      value={mounted && theme ? [theme] : []}
      onValueChange={(value) => value[0] && setTheme(value[0])}
    >
      {OPTIONS.map(({ value, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={t(value)}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
