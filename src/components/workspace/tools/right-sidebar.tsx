"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  Bug,
  Eye,
  GitCompare,
  Globe,
  Maximize2,
  X,
} from "lucide-react";
import {
  useWorkspaceLayout,
  type RightView,
} from "@/lib/workspace/layout-state";
import { useWorkspaceViewport } from "../workspace-shell";

const TOOL_META: Record<
  RightView,
  { label: string; title: string; copy: string }
> = {
  changes: {
    label: "Changes",
    title: "Git changes unavailable",
    copy: "Repository status, file diffs, staging, and commits appear once a workspace Git adapter is connected.",
  },
  preview: {
    label: "Preview",
    title: "Project preview unavailable",
    copy: "Live project preview requires an authorized development server running in a connected project runtime.",
  },
  browser: {
    label: "Browser",
    title: "Browser session unavailable",
    copy: "Isolated browser inspection requires a configured runtime browser service.",
  },
  debug: {
    label: "Debug",
    title: "Debug signals unavailable",
    copy: "Console logs, runtime exceptions, network failures, and build errors appear here when a session is connected.",
  },
};

function ToolIcon({ view }: { view: RightView }) {
  if (view === "changes") return <GitCompare size={20} className="rb-empty-icon" aria-hidden="true" />;
  if (view === "preview") return <Eye size={20} className="rb-empty-icon" aria-hidden="true" />;
  if (view === "browser") return <Globe size={20} className="rb-empty-icon" aria-hidden="true" />;
  return <Bug size={20} className="rb-empty-icon" aria-hidden="true" />;
}

const RIGHT_TABS: RightView[] = ["changes", "preview", "browser", "debug"];

export function RightSidebar() {
  const { state, dispatch } = useWorkspaceLayout();
  const { mode, closeCompactDrawer } = useWorkspaceViewport();

  const handleClose = () => {
    if (mode === "drawers") {
      closeCompactDrawer();
    } else {
      dispatch({ type: "set-open", panel: "right", value: false });
    }
  };

  return (
    <aside
      id="rb-right-pane"
      className="rb-sidebar"
      role="region"
      aria-label="Workspace tools"
    >
      <TabsPrimitive.Root
        value={state.rightView}
        onValueChange={(value) =>
          dispatch({ type: "set-right-view", view: value as RightView })
        }
        className="rb-tabs-root"
      >
        <div className="rb-pane-head">
          <TabsPrimitive.List
            className="rb-tools-tabs rb-segmented"
            aria-label="Workspace tool views"
          >
            {RIGHT_TABS.map((view) => (
              <TabsPrimitive.Trigger
                key={view}
                value={view}
                className="rb-seg-tab"
              >
                {TOOL_META[view].label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <button
            type="button"
            className="rb-button rb-icon-button"
            aria-label="Hide workspace tools"
            title="Hide tools"
            onClick={handleClose}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {RIGHT_TABS.map((view) => (
          <TabsPrimitive.Content
            key={view}
            value={view}
            className="rb-pane-body"
          >
            <div className="rb-empty-state">
              <ToolIcon view={view} />
              <p className="rb-empty-title">{TOOL_META[view].title}</p>
              <p className="rb-empty-copy">{TOOL_META[view].copy}</p>
            </div>
          </TabsPrimitive.Content>
        ))}
      </TabsPrimitive.Root>

      <div className="rb-tool-foot">
        <button
          type="button"
          className="rb-button"
          disabled
          aria-disabled="true"
          title="Expand into workspace is unavailable until this tool is connected"
        >
          <Maximize2 size={13} aria-hidden="true" />
          <span>Expand into workspace (unavailable)</span>
        </button>
      </div>
    </aside>
  );
}
