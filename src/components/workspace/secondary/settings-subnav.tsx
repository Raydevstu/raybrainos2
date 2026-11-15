"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SECONDARY_ITEMS } from "@/lib/workspace/navigation";

export function SettingsSubnav() {
  const pathname = usePathname();
  return (
    <div className="rb-sec-subnav" role="navigation" aria-label="Settings sections">
      {SETTINGS_SECONDARY_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="rb-back-link"
            aria-current={active ? "page" : undefined}
            style={{
              backgroundColor: active ? "var(--rb-surface)" : "transparent",
              borderColor: active
                ? "var(--rb-border)"
                : "var(--rb-border-subtle)",
              color: active ? "var(--rb-text)" : "var(--rb-muted)",
            }}
          >
            {item.shortLabel}
          </Link>
        );
      })}
    </div>
  );
}
