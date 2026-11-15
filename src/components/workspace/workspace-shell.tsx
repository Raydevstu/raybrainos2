"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LEFT_MAX_WIDTH,
  LEFT_MIN_WIDTH,
  RIGHT_MAX_WIDTH,
  RIGHT_MIN_WIDTH,
  useWorkspaceLayout,
  type RightView,
} from "@/lib/workspace/layout-state";
import { ResizeHandle } from "./resize-handle";
import { SidebarDrawer } from "./sidebar-drawer";

export type LayoutMode = "desktop" | "drawers";
export type CompactDrawer = "left" | "right" | null;

interface ColumnInput {
  width: number;
  leftOpen: boolean;
  rightOpen: boolean;
  preferredLeftWidth: number;
  preferredRightWidth: number;
}

export function calculateWorkspaceColumns(input: ColumnInput) {
  const handle = 6;
  const centerMinimum = 480;

  if (input.width < 1200) {
    return {
      mode: "drawers" as const,
      template: "minmax(0, 1fr)",
      leftWidth: 0,
      rightWidth: 0,
      leftMin: LEFT_MIN_WIDTH,
      leftMax: LEFT_MAX_WIDTH,
      rightMin: RIGHT_MIN_WIDTH,
      rightMax: RIGHT_MAX_WIDTH,
    };
  }

  const handles =
    (input.leftOpen ? handle : 0) + (input.rightOpen ? handle : 0);
  const sideBudget = Math.max(0, input.width - centerMinimum - handles);

  const rightMinReserve = input.rightOpen ? RIGHT_MIN_WIDTH : 0;
  const leftMax = Math.min(
    LEFT_MAX_WIDTH,
    Math.max(LEFT_MIN_WIDTH, sideBudget - rightMinReserve),
  );
  const leftWidth = input.leftOpen
    ? Math.round(
        Math.min(Math.max(LEFT_MIN_WIDTH, input.preferredLeftWidth), leftMax),
      )
    : 0;

  const rightMax = Math.min(
    RIGHT_MAX_WIDTH,
    Math.max(RIGHT_MIN_WIDTH, sideBudget - leftWidth),
  );
  const rightWidth = input.rightOpen
    ? Math.round(
        Math.min(Math.max(RIGHT_MIN_WIDTH, input.preferredRightWidth), rightMax),
      )
    : 0;

  const columns: string[] = [];
  if (input.leftOpen) {
    columns.push(`${leftWidth}px`, `${handle}px`);
  }
  columns.push("minmax(0, 1fr)");
  if (input.rightOpen) {
    columns.push(`${handle}px`, `${rightWidth}px`);
  }

  return {
    mode: "desktop" as const,
    template: columns.join(" "),
    leftWidth,
    rightWidth,
    leftMin: LEFT_MIN_WIDTH,
    leftMax: Math.round(leftMax),
    rightMin: RIGHT_MIN_WIDTH,
    rightMax: Math.round(rightMax),
  };
}

export function calculateTerminalLayout(
  centerHeight: number,
  preferredHeight: number,
) {
  const handle = 6;
  const safeHeight = Math.max(0, Math.round(centerHeight));
  const minCenterWork = Math.min(220, Math.floor(safeHeight * 0.5));
  const available = Math.max(0, safeHeight - handle - minCenterWork);
  const max = Math.min(600, available);
  const min = Math.min(140, max);
  const height = Math.round(Math.min(max, Math.max(min, preferredHeight)));
  return { height, min, max };
}

interface WorkspaceViewportContextValue {
  mode: LayoutMode;
  compactDrawer: CompactDrawer;
  leftVisible: boolean;
  rightVisible: boolean;
  terminalVisible: boolean;
  toggleLeft: (opener?: HTMLElement | null) => void;
  toggleRight: (opener?: HTMLElement | null) => void;
  openRightTool: (view: RightView, opener?: HTMLElement | null) => void;
  toggleTerminal: () => void;
  toggleFocusMode: () => void;
  closeCompactDrawer: () => void;
}

const WorkspaceViewportContext =
  createContext<WorkspaceViewportContextValue | null>(null);

export function useWorkspaceViewport(): WorkspaceViewportContextValue {
  const context = useContext(WorkspaceViewportContext);
  if (!context) {
    throw new Error("useWorkspaceViewport requires WorkspaceShell");
  }
  return context;
}

export interface WorkspaceShellProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  terminal: ReactNode;
  right: ReactNode;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function WorkspaceShell({
  header,
  left,
  center,
  terminal,
  right,
}: WorkspaceShellProps) {
  const { state, dispatch, ready } = useWorkspaceLayout();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodySize, setBodySize] = useState({ width: 1440, height: 956 });
  const [compactDrawer, setCompactDrawer] = useState<CompactDrawer>(null);
  const [drawerOpener, setDrawerOpener] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBodySize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextW = Math.round(entry.contentRect.width);
      const nextH = Math.round(entry.contentRect.height);
      if (nextW > 0 && nextH > 0) {
        setBodySize((prev) =>
          prev.width === nextW && prev.height === nextH
            ? prev
            : { width: nextW, height: nextH },
        );
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isDesktop = bodySize.width >= 1200;

  // Clear temporary compact drawer when crossing to desktop or entering focus mode
  // without touching remembered desktop leftOpen / rightOpen state.
  useEffect(() => {
    if (isDesktop && compactDrawer !== null) {
      setCompactDrawer(null);
    }
  }, [isDesktop, compactDrawer]);

  useEffect(() => {
    if (state.focusMode && compactDrawer !== null) {
      setCompactDrawer(null);
    }
  }, [state.focusMode, compactDrawer]);

  const effectiveDesktopLeftOpen =
    isDesktop && !state.focusMode && state.leftOpen;
  const effectiveDesktopRightOpen =
    isDesktop && !state.focusMode && state.rightOpen;
  const effectiveTerminalOpen = !state.focusMode && state.terminalOpen;

  const columns = useMemo(
    () =>
      calculateWorkspaceColumns({
        width: bodySize.width,
        leftOpen: effectiveDesktopLeftOpen,
        rightOpen: effectiveDesktopRightOpen,
        preferredLeftWidth: state.leftWidth,
        preferredRightWidth: state.rightWidth,
      }),
    [
      bodySize.width,
      effectiveDesktopLeftOpen,
      effectiveDesktopRightOpen,
      state.leftWidth,
      state.rightWidth,
    ],
  );

  const terminalMetrics = useMemo(
    () => calculateTerminalLayout(bodySize.height, state.terminalHeight),
    [bodySize.height, state.terminalHeight],
  );

  const captureOpener = (opener?: HTMLElement | null) => {
    if (opener instanceof HTMLElement) {
      setDrawerOpener(opener);
    } else if (document.activeElement instanceof HTMLElement) {
      setDrawerOpener(document.activeElement);
    }
  };

  const getFallbackFocusTarget = useCallback(
    (side: "left" | "right"): HTMLElement | null => {
      const root = rootRef.current;
      if (!root) return null;
      return (
        root.querySelector<HTMLElement>(
          `[data-rb-drawer-fallback="${side}"]:not(:disabled)`,
        ) ??
        root.querySelector<HTMLElement>(
          ".rb-header button:not(:disabled), .rb-center-tab, .rb-textarea",
        )
      );
    },
    [],
  );

  const toggleLeft = useCallback(
    (opener?: HTMLElement | null) => {
      if (isDesktop) {
        dispatch({ type: "toggle", panel: "left" });
        return;
      }

      if (compactDrawer === "left") {
        setCompactDrawer(null);
      } else {
        captureOpener(opener);
        setCompactDrawer("left");
      }
    },
    [isDesktop, compactDrawer, dispatch],
  );

  const toggleRight = useCallback(
    (opener?: HTMLElement | null) => {
      if (isDesktop) {
        dispatch({ type: "toggle", panel: "right" });
        return;
      }

      if (compactDrawer === "right") {
        setCompactDrawer(null);
      } else {
        captureOpener(opener);
        setCompactDrawer("right");
      }
    },
    [isDesktop, compactDrawer, dispatch],
  );

  const openRightTool = useCallback(
    (view: RightView, opener?: HTMLElement | null) => {
      if (isDesktop) {
        if (!state.focusMode && state.rightOpen && state.rightView === view) {
          dispatch({ type: "set-open", panel: "right", value: false });
        } else {
          dispatch({ type: "open-desktop-right-view", view });
        }
        return;
      }

      // Compact mode: select tool view and open drawer without mutating desktop rightOpen.
      dispatch({ type: "set-right-view", view });
      if (compactDrawer === "right" && state.rightView === view) {
        setCompactDrawer(null);
      } else {
        captureOpener(opener);
        setCompactDrawer("right");
      }
    },
    [
      isDesktop,
      compactDrawer,
      state.focusMode,
      state.rightOpen,
      state.rightView,
      dispatch,
    ],
  );

  const toggleTerminal = useCallback(() => {
    dispatch({ type: "toggle", panel: "terminal" });
  }, [dispatch]);

  const toggleFocusMode = useCallback(() => {
    setCompactDrawer(null);
    dispatch({ type: "focus", value: !state.focusMode });
  }, [dispatch, state.focusMode]);

  const closeCompactDrawer = useCallback(() => {
    setCompactDrawer(null);
  }, []);

  const viewportValue = useMemo<WorkspaceViewportContextValue>(
    () => ({
      mode: columns.mode,
      compactDrawer,
      leftVisible: isDesktop
        ? effectiveDesktopLeftOpen
        : compactDrawer === "left",
      rightVisible: isDesktop
        ? effectiveDesktopRightOpen
        : compactDrawer === "right",
      terminalVisible: effectiveTerminalOpen,
      toggleLeft,
      toggleRight,
      openRightTool,
      toggleTerminal,
      toggleFocusMode,
      closeCompactDrawer,
    }),
    [
      columns.mode,
      compactDrawer,
      isDesktop,
      effectiveDesktopLeftOpen,
      effectiveDesktopRightOpen,
      effectiveTerminalOpen,
      toggleLeft,
      toggleRight,
      openRightTool,
      toggleTerminal,
      toggleFocusMode,
      closeCompactDrawer,
    ],
  );

  return (
    <WorkspaceViewportContext.Provider value={viewportValue}>
      <div
        ref={rootRef}
        className="rb-workspace"
        data-testid="workspace-ready"
        data-ready={ready ? "true" : "false"}
        data-mode={columns.mode}
        data-focus={state.focusMode ? "true" : "false"}
      >
        {header}

        <div
          ref={bodyRef}
          className="rb-body"
          style={{ gridTemplateColumns: columns.template }}
        >
          {effectiveDesktopLeftOpen && (
            <>
              <div className="rb-pane rb-sidebar">{left}</div>
              <ResizeHandle
                label="Resize project navigation"
                controls="rb-left-pane"
                orientation="vertical"
                value={columns.leftWidth}
                min={columns.leftMin}
                max={columns.leftMax}
                direction={1}
                onChange={(next) =>
                  dispatch({ type: "resize", panel: "left", value: next })
                }
              />
            </>
          )}

          <main
            className="rb-center"
            aria-label="Primary workspace"
            style={{
              gridTemplateRows: effectiveTerminalOpen
                ? `minmax(0, 1fr) 6px ${terminalMetrics.height}px`
                : "minmax(0, 1fr)",
            }}
          >
            <div className="rb-work-area">{center}</div>

            {effectiveTerminalOpen && (
              <>
                <ResizeHandle
                  label="Resize terminal"
                  controls="rb-terminal-pane"
                  orientation="horizontal"
                  value={terminalMetrics.height}
                  min={terminalMetrics.min}
                  max={terminalMetrics.max}
                  direction={-1}
                  onChange={(next) =>
                    dispatch({
                      type: "resize",
                      panel: "terminal",
                      value: next,
                    })
                  }
                />
                <div className="rb-terminal">{terminal}</div>
              </>
            )}
          </main>

          {effectiveDesktopRightOpen && (
            <>
              <ResizeHandle
                label="Resize workspace tools"
                controls="rb-right-pane"
                orientation="vertical"
                value={columns.rightWidth}
                min={columns.rightMin}
                max={columns.rightMax}
                direction={-1}
                onChange={(next) =>
                  dispatch({ type: "resize", panel: "right", value: next })
                }
              />
              <div className="rb-pane rb-sidebar">{right}</div>
            </>
          )}
        </div>

        {/* Keep Drawer roots mounted across breakpoint transitions so closing
            via resize runs Radix Dialog close/focus restoration cleanly. */}
        <SidebarDrawer
          open={!isDesktop && compactDrawer === "left"}
          side="left"
          title="Project navigation"
          description="Browse workspace files and conversations."
          openerElement={drawerOpener}
          getFallbackElement={() => getFallbackFocusTarget("left")}
          onOpenChange={(open) => setCompactDrawer(open ? "left" : null)}
        >
          {left}
        </SidebarDrawer>

        <SidebarDrawer
          open={!isDesktop && compactDrawer === "right"}
          side="right"
          title="Workspace tools"
          description="Inspect changes, preview, browser, and debug signals."
          openerElement={drawerOpener}
          getFallbackElement={() => getFallbackFocusTarget("right")}
          onOpenChange={(open) => setCompactDrawer(open ? "right" : null)}
        >
          {right}
        </SidebarDrawer>
      </div>
    </WorkspaceViewportContext.Provider>
  );
}
