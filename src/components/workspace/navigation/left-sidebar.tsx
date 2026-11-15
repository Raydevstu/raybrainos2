"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  FolderOpen,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
} from "lucide-react";
import {
  useWorkspaceLayout,
  type LeftView,
} from "@/lib/workspace/layout-state";
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
      <TabsPrimitive.Root
        value={state.leftView}
        onValueChange={(value) =>
          dispatch({ type: "set-left-view", view: value as LeftView })
        }
        className="rb-tabs-root"
      >
        <div className="rb-pane-head">
          <TabsPrimitive.List
            className="rb-segmented"
            aria-label="Navigation view"
          >
            <TabsPrimitive.Trigger value="files" className="rb-seg-tab">
              Files
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="chats" className="rb-seg-tab">
              Chats
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

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

        <TabsPrimitive.Content value="files" className="rb-pane-body">
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
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="chats" className="rb-pane-body">
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
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </aside>
  );
}
