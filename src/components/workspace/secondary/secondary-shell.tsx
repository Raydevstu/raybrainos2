"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Info, Search } from "lucide-react";
import "@/components/workspace/workspace.css";
import { cortexEnv } from "@/lib/api/http";
import {
  SETTINGS_SECONDARY_ITEMS,
  WORKSPACE_SECONDARY_ITEMS,
} from "@/lib/workspace/navigation";
import { CommandPalette } from "../command-palette";
import { SecondaryIcon } from "../secondary-icon";

interface SecondaryShellProps {
  title: string;
  description: string;
  statusNote?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function SecondaryShell({
  title,
  description,
  statusNote,
  actions,
  children,
}: SecondaryShellProps) {
  const pathname = usePathname();
  const env = cortexEnv();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteOpener, setPaletteOpener] = useState<HTMLElement | null>(null);

  return (
    <div className="rb-secondary" data-testid="secondary-page">
      <header className="rb-sec-header" aria-label="Secondary navigation">
        <div className="rb-sec-header-left">
          <Link href="/" className="rb-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to workspace</span>
          </Link>

          <div className="rb-brand">
            <span className="rb-brand-name">RayBrain</span>
            <span className="rb-brand-sep" aria-hidden="true">
              /
            </span>
            <span className="rb-project-label">{title}</span>
          </div>
        </div>

        <div className="rb-sec-header-right">
          <button
            type="button"
            className="rb-button"
            aria-label="Open command palette"
            aria-haspopup="dialog"
            aria-expanded={paletteOpen}
            title="Command palette (⌘K)"
            onClick={(event) => {
              setPaletteOpener(event.currentTarget);
              setPaletteOpen(true);
            }}
          >
            <Search size={14} aria-hidden="true" />
            <span className="rb-button-label">Commands</span>
            <kbd className="rb-kbd-badge">⌘K</kbd>
          </button>
        </div>
      </header>

      <div className="rb-sec-layout">
        <nav className="rb-sec-nav" aria-label="Secondary sections">
          <div className="rb-sec-nav-group">
            <div className="rb-sec-nav-heading">Workspace</div>
            {WORKSPACE_SECONDARY_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rb-sec-nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  <SecondaryIcon name={item.icon} size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="rb-sec-nav-group">
            <div className="rb-sec-nav-heading">Settings</div>
            {SETTINGS_SECONDARY_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rb-sec-nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  <SecondaryIcon name={item.icon} size={14} />
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="rb-sec-main">
          <div className="rb-sec-title-row">
            <div>
              <h1 className="rb-sec-title">{title}</h1>
              <p className="rb-sec-desc">{description}</p>
            </div>
            {actions ? <div className="rb-sec-toolbar">{actions}</div> : null}
          </div>

          <div className="rb-sec-notice" role="note">
            <Info size={14} aria-hidden="true" />
            <span className="rb-badge rb-badge-warn">
              {env.mode === "live"
                ? "Live env configured · Batch 3+ backend pending"
                : "Demo-only seeded state"}
            </span>
            <span>
              {statusNote ??
                "Server-side workspace persistence, authorization, and live runtime orchestration are not yet connected."}
            </span>
          </div>

          {children}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        openerElement={paletteOpener}
      />
    </div>
  );
}
