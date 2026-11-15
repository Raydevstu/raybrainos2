"use client";

import { Minus, Square, TerminalSquare } from "lucide-react";
import { useWorkspaceLayout } from "@/lib/workspace/layout-state";

export function TerminalDrawer() {
  const { dispatch } = useWorkspaceLayout();

  return (
    <section
      id="rb-terminal-pane"
      className="rb-terminal"
      role="region"
      aria-label="Terminal"
    >
      <div className="rb-terminal-head">
        <span className="rb-terminal-title">
          <TerminalSquare size={13} aria-hidden="true" />
          <span>Terminal</span>
        </span>

        <div className="rb-terminal-actions">
          <button
            type="button"
            className="rb-button"
            disabled
            aria-disabled="true"
            title="No active terminal session to terminate"
          >
            <Square size={12} aria-hidden="true" />
            <span>Terminate</span>
          </button>

          <button
            type="button"
            className="rb-button rb-icon-button"
            aria-label="Hide terminal"
            title="Hide terminal (keeps any active session running)"
            onClick={() =>
              dispatch({ type: "set-open", panel: "terminal", value: false })
            }
          >
            <Minus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="rb-terminal-body">
        <div className="rb-empty-state">
          <TerminalSquare
            size={20}
            className="rb-empty-icon"
            aria-hidden="true"
          />
          <p className="rb-empty-title">Terminal unavailable</p>
          <p className="rb-empty-copy">
            Connect an isolated project runtime to run commands in a live shell
            session.
          </p>
        </div>
      </div>
    </section>
  );
}
