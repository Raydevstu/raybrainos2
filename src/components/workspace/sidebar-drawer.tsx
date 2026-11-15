"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface SidebarDrawerProps {
  open: boolean;
  side: "left" | "right";
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function SidebarDrawer({
  open,
  side,
  title,
  description,
  onOpenChange,
  children,
}: SidebarDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rb-drawer-overlay" />
        <DialogPrimitive.Content
          className="rb-drawer-content"
          data-side={side}
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
