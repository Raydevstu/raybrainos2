"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  ArrowLeft,
  Bug,
  Compass,
  Eye,
  FolderTree,
  GitCompare,
  Maximize2,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Search,
  TerminalSquare,
  X,
} from "lucide-react";
import { useOptionalWorkspaceLayout } from "@/lib/workspace/layout-state";
import {
  SETTINGS_SECONDARY_ITEMS,
  WORKSPACE_SECONDARY_ITEMS,
} from "@/lib/workspace/navigation";
import { useOptionalWorkspaceViewport } from "./workspace-shell";
import { SecondaryIcon } from "./secondary-icon";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openerElement?: HTMLElement | null;
}

export function CommandPalette({
  open,
  onOpenChange,
  openerElement = null,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const layout = useOptionalWorkspaceLayout();
  const viewport = useOptionalWorkspaceViewport();
  const [query, setQuery] = useState("");
  const lastFocusedBeforeOpen = useRef<HTMLElement | null>(null);
  const skipFocusRestore = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (!open && document.activeElement instanceof HTMLElement) {
          lastFocusedBeforeOpen.current = document.activeElement;
        }
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const runAction = (fn: () => void, navigating = false) => {
    skipFocusRestore.current = navigating;
    onOpenChange(false);
    fn();
  };

  const navigateTo = (href: string) => {
    runAction(() => {
      router.push(href);
    }, href !== pathname);
  };

  const inWorkspace = Boolean(viewport && layout);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rb-command-overlay" />
        <DialogPrimitive.Content
          className="rb-command-content"
          onCloseAutoFocus={(event) => {
            if (skipFocusRestore.current) {
              skipFocusRestore.current = false;
              event.preventDefault();
              return;
            }
            const target = openerElement ?? lastFocusedBeforeOpen.current;
            if (target && target.isConnected) {
              event.preventDefault();
              target.focus({ preventScroll: true });
            }
          }}
        >
          <DialogPrimitive.Title className="rb-sr-only">
            Command palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="rb-sr-only">
            Search workspace actions and secondary pages.
          </DialogPrimitive.Description>

          <Command
            className="rb-command-root"
            label="Search commands and pages"
          >
            <div className="rb-command-input-wrap">
              <Search size={14} aria-hidden="true" className="rb-muted" />
              <Command.Input
                className="rb-command-input"
                value={query}
                onValueChange={setQuery}
                placeholder="Type a command or page…"
                aria-label="Search commands and pages"
              />
              <button
                type="button"
                className="rb-button rb-icon-button"
                aria-label="Close command palette"
                onClick={() => onOpenChange(false)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            <Command.List className="rb-command-list">
              <Command.Empty className="rb-command-empty">
                No matching commands or pages.
              </Command.Empty>

              {inWorkspace && viewport && layout ? (
                <>
                  <Command.Group heading="Workspace" className="rb-command-group">
                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.toggleLeft(
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <PanelLeft size={14} aria-hidden="true" />
                      <span>Toggle left sidebar</span>
                      <span className="rb-command-meta">
                        {viewport.leftVisible ? "Visible" : "Hidden"}
                      </span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openLeftView(
                            "files",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <FolderTree size={14} aria-hidden="true" />
                      <span>Show Files view</span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openLeftView(
                            "chats",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <MessageSquare size={14} aria-hidden="true" />
                      <span>Show Chats view</span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.toggleRight(
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <PanelRight size={14} aria-hidden="true" />
                      <span>Toggle right sidebar</span>
                      <span className="rb-command-meta">
                        {viewport.rightVisible ? "Visible" : "Hidden"}
                      </span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() => runAction(() => viewport.toggleTerminal())}
                    >
                      <TerminalSquare size={14} aria-hidden="true" />
                      <span>Toggle terminal drawer</span>
                      <span className="rb-command-meta">
                        {viewport.terminalVisible ? "Open" : "Closed"}
                      </span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() => runAction(() => viewport.toggleFocusMode())}
                    >
                      <Maximize2 size={14} aria-hidden="true" />
                      <span>
                        {layout.state.focusMode
                          ? "Exit focus mode"
                          : "Enter focus mode"}
                      </span>
                    </Command.Item>
                  </Command.Group>

                  <Command.Separator className="rb-command-sep" />

                  <Command.Group heading="Tools" className="rb-command-group">
                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openRightTool(
                            "changes",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <GitCompare size={14} aria-hidden="true" />
                      <span>Open Changes</span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openRightTool(
                            "preview",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>Open Preview</span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openRightTool(
                            "browser",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <Compass size={14} aria-hidden="true" />
                      <span>Open Browser</span>
                    </Command.Item>

                    <Command.Item
                      className="rb-command-item"
                      onSelect={() =>
                        runAction(() =>
                          viewport.openRightTool(
                            "debug",
                            openerElement ?? lastFocusedBeforeOpen.current,
                          ),
                        )
                      }
                    >
                      <Bug size={14} aria-hidden="true" />
                      <span>Open Debug</span>
                    </Command.Item>
                  </Command.Group>

                  <Command.Separator className="rb-command-sep" />
                </>
              ) : (
                <>
                  <Command.Group heading="Workspace" className="rb-command-group">
                    <Command.Item
                      className="rb-command-item"
                      onSelect={() => navigateTo("/")}
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      <span>Back to workspace</span>
                      <span className="rb-command-meta">/</span>
                    </Command.Item>
                  </Command.Group>
                  <Command.Separator className="rb-command-sep" />
                </>
              )}

              <Command.Group heading="Navigate" className="rb-command-group">
                {WORKSPACE_SECONDARY_ITEMS.map((item) => (
                  <Command.Item
                    key={item.href}
                    className="rb-command-item"
                    value={`${item.label} ${item.description}`}
                    onSelect={() => navigateTo(item.href)}
                  >
                    <SecondaryIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                    <span className="rb-command-meta">{item.href}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Separator className="rb-command-sep" />

              <Command.Group heading="Settings" className="rb-command-group">
                {SETTINGS_SECONDARY_ITEMS.map((item) => (
                  <Command.Item
                    key={item.href}
                    className="rb-command-item"
                    value={`Settings ${item.label} ${item.description}`}
                    onSelect={() => navigateTo(item.href)}
                  >
                    <SecondaryIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                    <span className="rb-command-meta">{item.href}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
