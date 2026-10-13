"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => {
        // cross-fade colours for a moment so the day/night change feels smooth
        const root = document.documentElement;
        root.classList.add("theme-fade");
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        window.setTimeout(() => root.classList.remove("theme-fade"), 450);
      }}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
