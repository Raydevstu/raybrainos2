"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  GitCompare,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Search,
  TerminalSquare,
} from "lucide-react";
import { useWorkspaceLayout } from "@/lib/workspace/layout-state";
import {
  SETTINGS_SECONDARY_ITEMS,
  WORKSPACE_SECONDARY_ITEMS,
} from "@/lib/workspace/navigation";
import { useWorkspaceViewport } from "./workspace-shell";
import { CommandPalette } from "./command-palette";
import { SecondaryIcon } from "./secondary-icon";

export function WorkspaceHeader() {
  const router = useRouter();
  const { state } = useWorkspaceLayout();
  const {
    leftVisible,
    rightVisible,
    terminalVisible,
    toggleLeft,
    toggleRight,
    openRightTool,
    toggleTerminal,
    toggleFocusMode,
  } = useWorkspaceViewport();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteOpener, setPaletteOpener] = useState<HTMLElement | null>(null);

  return (
    <>
      <header className="rb-header" aria-label="Workspace controls">
        <div className="rb-header-group">
          <button
            type="button"
            className="rb-button rb-icon-button"
            data-rb-drawer-fallback="left"
            aria-label="Toggle project navigation"
            aria-expanded={leftVisible}
            aria-pressed={leftVisible}
            title={leftVisible ? "Hide navigation" : "Show navigation"}
            onClick={(event) => toggleLeft(event.currentTarget)}
          >
            <PanelLeft size={16} aria-hidden="true" />
          </button>

          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                className="rb-button rb-icon-button"
                aria-label="Open application menu"
                title="Pages & settings"
              >
                <LayoutGrid size={15} aria-hidden="true" />
              </button>
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                className="rb-menu-content"
                align="start"
                sideOffset={6}
                collisionPadding={10}
              >
                <DropdownMenuPrimitive.Label className="rb-menu-label">
                  Workspace pages
                </DropdownMenuPrimitive.Label>
                {WORKSPACE_SECONDARY_ITEMS.map((item) => (
                  <DropdownMenuPrimitive.Item
                    key={item.href}
                    className="rb-menu-item"
                    onSelect={() => router.push(item.href)}
                  >
                    <SecondaryIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </DropdownMenuPrimitive.Item>
                ))}

                <DropdownMenuPrimitive.Separator className="rb-menu-sep" />

                <DropdownMenuPrimitive.Label className="rb-menu-label">
                  Settings
                </DropdownMenuPrimitive.Label>
                {SETTINGS_SECONDARY_ITEMS.map((item) => (
                  <DropdownMenuPrimitive.Item
                    key={item.href}
                    className="rb-menu-item"
                    onSelect={() => router.push(item.href)}
                  >
                    <SecondaryIcon name={item.icon} size={14} />
                    <span>{item.shortLabel}</span>
                  </DropdownMenuPrimitive.Item>
                ))}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>

          <div className="rb-brand">
            <span className="rb-brand-name">RayBrain</span>
            <span className="rb-brand-sep" aria-hidden="true">
              /
            </span>
            <span className="rb-project-label">No workspace connected</span>
          </div>
        </div>

        <div className="rb-header-group">
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

          <button
            type="button"
            className="rb-button"
            aria-label="Toggle terminal"
            aria-expanded={terminalVisible}
            aria-pressed={terminalVisible}
            title={terminalVisible ? "Hide terminal" : "Open terminal"}
            onClick={toggleTerminal}
          >
            <TerminalSquare size={15} aria-hidden="true" />
            <span className="rb-button-label">Terminal</span>
          </button>

          <button
            type="button"
            className="rb-button"
            aria-label="Open changes"
            aria-pressed={rightVisible && state.rightView === "changes"}
            title="Open changes"
            onClick={(event) => openRightTool("changes", event.currentTarget)}
          >
            <GitCompare size={15} aria-hidden="true" />
            <span className="rb-button-label">Changes</span>
          </button>

          <button
            type="button"
            className="rb-button rb-icon-button"
            data-rb-drawer-fallback="right"
            aria-label="Toggle workspace tools"
            aria-expanded={rightVisible}
            aria-pressed={rightVisible}
            title={rightVisible ? "Hide tools" : "Open tools"}
            onClick={(event) => toggleRight(event.currentTarget)}
          >
            <PanelRight size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="rb-button rb-icon-button"
            aria-label={state.focusMode ? "Exit focus mode" : "Enter focus mode"}
            aria-pressed={state.focusMode}
            title={state.focusMode ? "Exit focus mode" : "Focus mode"}
            onClick={toggleFocusMode}
          >
            {state.focusMode ? (
              <Minimize2 size={15} aria-hidden="true" />
            ) : (
              <Maximize2 size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        openerElement={paletteOpener}
      />
    </>
  );
}
