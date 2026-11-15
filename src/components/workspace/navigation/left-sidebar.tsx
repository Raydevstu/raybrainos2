"use client";

import {
  FolderOpen,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
} from "lucide-react";
import { useWorkspaceLayout } from "@/lib/workspace/layout-state";
import { useWorkspaceViewport } from "../workspace-shell";

export function LeftSidebar() {
  const { state, dispatch } = useWorkspaceLayout();
  const { mode, closeCompactDrawer } = useWorkspaceViewport();

  const handleClose = () => {
    if (mode === "drawers") {
      closeCompactDrawer();
    } else {
      dispatch({ type: "set-open", panel: "left", value: false });
    }
  };

  return (
    <aside
      id="rb-left-pane"
      className="rb-sidebar"
      role="region"
      aria-label="Project navigation"
    >
      <div className="rb-pane-head">
        <div
          className="rb-segmented"
          role="tablist"
          aria-label="Navigation view"
        >
          <button
            type="button"
            role="tab"
            id="rb-left-tab-files"
            aria-selected={state.leftView === "files"}
            aria-controls="rb-left-panel-files"
            className="rb-seg-tab"
            onClick={() => dispatch({ type: "left-view", view: "files" })}
          >
            Files
          </button>
          <button
            type="button"
            role="tab"
            id="rb-left-tab-chats"
            aria-selected={state.leftView === "chats"}
            aria-controls="rb-left-panel-chats"
            className="rb-seg-tab"
            onClick={() => dispatch({ type: "left-view", view: "chats" })}
          >
            Chats
          </button>
        </div>

        <button
          type="button"
          className="rb-button rb-icon-button"
          aria-label="Hide project navigation"
          title="Hide navigation"
          onClick={handleClose}
        >
          <PanelLeftClose size={15} aria-hidden="true" />
        </button>
      </div>

      {state.leftView === "files" ? (
        <div
          id="rb-left-panel-files"
          role="tabpanel"
          aria-labelledby="rb-left-tab-files"
          className="rb-pane-body"
        >
          <div className="rb-search-wrap">
            <Search size={13} aria-hidden="true" />
            <input
              type="search"
              className="rb-input"
              placeholder="Search files (not connected)"
              aria-label="Search workspace files"
              disabled
            />
          </div>

          <div className="rb-empty-state">
            <FolderOpen size={20} className="rb-empty-icon" aria-hidden="true" />
            <p className="rb-empty-title">No workspace files</p>
            <p className="rb-empty-copy">
              Connect a workspace runtime to browse and edit project files.
            </p>
          </div>
        </div>
      ) : (
        <div
          id="rb-left-panel-chats"
          role="tabpanel"
          aria-labelledby="rb-left-tab-chats"
          className="rb-pane-body"
        >
          <button
            type="button"
            className="rb-button"
            disabled
            title="Chat persistence is not connected yet"
          >
            <Plus size={14} aria-hidden="true" />
            <span>New chat (unavailable)</span>
          </button>

          <div className="rb-empty-state">
            <MessageSquare
              size={20}
              className="rb-empty-icon"
              aria-hidden="true"
            />
            <p className="rb-empty-title">No conversations</p>
            <p className="rb-empty-copy">
              Saved project conversations will appear here once backend storage
              is connected.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
