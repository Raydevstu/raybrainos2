"use client";

import "./workspace.css";
import { WorkspaceLayoutProvider } from "@/lib/workspace/layout-state";
import { WorkspaceShell } from "./workspace-shell";
import { WorkspaceHeader } from "./workspace-header";
import { LeftSidebar } from "./navigation/left-sidebar";
import { WorkspaceTabs } from "./workspace-tabs";
import { TerminalDrawer } from "./terminal/terminal-drawer";
import { RightSidebar } from "./tools/right-sidebar";

export function WorkspaceRoot() {
  return (
    <WorkspaceLayoutProvider>
      <WorkspaceShell
        header={<WorkspaceHeader />}
        left={<LeftSidebar />}
        center={<WorkspaceTabs />}
        terminal={<TerminalDrawer />}
        right={<RightSidebar />}
      />
    </WorkspaceLayoutProvider>
  );
}
