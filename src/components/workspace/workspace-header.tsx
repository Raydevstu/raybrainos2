"use client";

import {
  GitCompare,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  TerminalSquare,
} from "lucide-react";
import { useWorkspaceLayout } from "@/lib/workspace/layout-state";
import { useWorkspaceViewport } from "./workspace-shell";

export function WorkspaceHeader() {
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

  return (
    <header className="rb-header" aria-label="Workspace controls">
      <div className="rb-header-group">
        <button
          type="button"
          className="rb-button rb-icon-button"
          aria-label="Toggle project navigation"
          aria-expanded={leftVisible}
          aria-pressed={leftVisible}
          title={leftVisible ? "Hide navigation" : "Show navigation"}
          onClick={toggleLeft}
        >
          <PanelLeft size={16} aria-hidden="true" />
        </button>

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
          onClick={() => openRightTool("changes")}
        >
          <GitCompare size={15} aria-hidden="true" />
          <span className="rb-button-label">Changes</span>
        </button>

        <button
          type="button"
          className="rb-button rb-icon-button"
          aria-label="Toggle workspace tools"
          aria-expanded={rightVisible}
          aria-pressed={rightVisible}
          title={rightVisible ? "Hide tools" : "Open tools"}
          onClick={toggleRight}
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
  );
}
