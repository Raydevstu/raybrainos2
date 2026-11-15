"use client";

import { useRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

function isFocusableTarget(
  element: HTMLElement | null | undefined,
): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;
  if (element.closest("[inert]")) return false;
  return element.getClientRects().length > 0;
}

interface SidebarDrawerProps {
  open: boolean;
  side: "left" | "right";
  title: string;
  description: string;
  openerElement: HTMLElement | null;
  getFallbackElement?: () => HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function SidebarDrawer({
  open,
  side,
  title,
  description,
  openerElement,
  getFallbackElement,
  onOpenChange,
  children,
}: SidebarDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const restoreFocus = () => {
    const active = document.activeElement;
    const focusInsideDrawer =
      active instanceof Node && (contentRef.current?.contains(active) ?? false);
    const focusLostToDocument =
      !active ||
      active === document.body ||
      active === document.documentElement;

    // Never steal focus if another surface outside the closing drawer already took it.
    if (!focusInsideDrawer && !focusLostToDocument) {
      return;
    }

    const candidates = [openerElement, getFallbackElement?.() ?? null];
    for (const candidate of candidates) {
      if (isFocusableTarget(candidate)) {
        candidate.focus({ preventScroll: true });
        if (document.activeElement === candidate) {
          return;
        }
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rb-drawer-overlay" />
        <DialogPrimitive.Content
          ref={contentRef}
          className="rb-drawer-content"
          data-side={side}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <DialogPrimitive.Title className="rb-sr-only">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="rb-sr-only">
            {description}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
