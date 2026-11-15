"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

export type LeftView = "files" | "chats";

export type RightView = "changes" | "preview" | "browser" | "debug";

export interface LayoutState {
  leftOpen: boolean;
  rightOpen: boolean;
  terminalOpen: boolean;

  leftView: LeftView;
  rightView: RightView;

  leftWidth: number;
  rightWidth: number;
  terminalHeight: number;

  focusMode: boolean;
}

type LayoutAction =
  | { type: "toggle"; panel: "left" | "right" | "terminal" }
  | { type: "set-open"; panel: "left" | "right" | "terminal"; value: boolean }
  | { type: "set-left-view"; view: LeftView }
  | { type: "set-right-view"; view: RightView }
  | { type: "open-desktop-right-view"; view: RightView }
  | { type: "resize"; panel: "left" | "right" | "terminal"; value: number }
  | { type: "focus"; value: boolean }
  | { type: "hydrate"; value: LayoutState };

export const LAYOUT_STORAGE_KEY = "raybrain.workspace.layout.v1";

export const LEFT_MIN_WIDTH = 200;
export const LEFT_MAX_WIDTH = 380;
export const RIGHT_MIN_WIDTH = 320;
export const RIGHT_MAX_WIDTH = 720;
export const TERMINAL_MIN_HEIGHT = 140;
export const TERMINAL_MAX_HEIGHT = 600;

export const DEFAULT_LAYOUT: LayoutState = {
  leftOpen: true,
  rightOpen: false,
  terminalOpen: false,

  leftView: "files",
  rightView: "changes",

  leftWidth: 248,
  rightWidth: 380,
  terminalHeight: 220,

  focusMode: false,
};

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(clamp(value, min, max))
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function decodeLayout(raw: string | null): LayoutState {
  if (!raw) return { ...DEFAULT_LAYOUT };

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_LAYOUT };
    }

    const value = parsed as Record<string, unknown>;
    const rightViews: RightView[] = ["changes", "preview", "browser", "debug"];

    return {
      leftOpen: booleanValue(value.leftOpen, DEFAULT_LAYOUT.leftOpen),
      rightOpen: booleanValue(value.rightOpen, DEFAULT_LAYOUT.rightOpen),
      terminalOpen: booleanValue(
        value.terminalOpen,
        DEFAULT_LAYOUT.terminalOpen,
      ),

      leftView: value.leftView === "chats" ? "chats" : "files",
      rightView: rightViews.includes(value.rightView as RightView)
        ? (value.rightView as RightView)
        : "changes",

      leftWidth: finiteNumber(
        value.leftWidth,
        DEFAULT_LAYOUT.leftWidth,
        LEFT_MIN_WIDTH,
        LEFT_MAX_WIDTH,
      ),
      rightWidth: finiteNumber(
        value.rightWidth,
        DEFAULT_LAYOUT.rightWidth,
        RIGHT_MIN_WIDTH,
        RIGHT_MAX_WIDTH,
      ),
      terminalHeight: finiteNumber(
        value.terminalHeight,
        DEFAULT_LAYOUT.terminalHeight,
        TERMINAL_MIN_HEIGHT,
        TERMINAL_MAX_HEIGHT,
      ),

      // Focus mode is intentionally ephemeral and never restored across reloads.
      focusMode: false,
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case "hydrate":
      return action.value;

    case "toggle": {
      if (action.panel === "left") {
        const nextOpen = state.focusMode ? true : !state.leftOpen;
        return { ...state, leftOpen: nextOpen, focusMode: false };
      }

      if (action.panel === "right") {
        const nextOpen = state.focusMode ? true : !state.rightOpen;
        return { ...state, rightOpen: nextOpen, focusMode: false };
      }

      const nextOpen = state.focusMode ? true : !state.terminalOpen;
      return { ...state, terminalOpen: nextOpen, focusMode: false };
    }

    case "set-open": {
      if (action.panel === "left") {
        return { ...state, leftOpen: action.value, focusMode: false };
      }
      if (action.panel === "right") {
        return { ...state, rightOpen: action.value, focusMode: false };
      }
      return { ...state, terminalOpen: action.value, focusMode: false };
    }

    case "set-left-view":
      return {
        ...state,
        leftView: action.view,
      };

    case "set-right-view":
      return {
        ...state,
        rightView: action.view,
      };

    case "open-desktop-right-view":
      return {
        ...state,
        rightView: action.view,
        rightOpen: true,
        focusMode: false,
      };

    case "resize": {
      if (!Number.isFinite(action.value)) return state;

      if (action.panel === "left") {
        return {
          ...state,
          leftWidth: Math.round(
            clamp(action.value, LEFT_MIN_WIDTH, LEFT_MAX_WIDTH),
          ),
        };
      }

      if (action.panel === "right") {
        return {
          ...state,
          rightWidth: Math.round(
            clamp(action.value, RIGHT_MIN_WIDTH, RIGHT_MAX_WIDTH),
          ),
        };
      }

      return {
        ...state,
        terminalHeight: Math.round(
          clamp(action.value, TERMINAL_MIN_HEIGHT, TERMINAL_MAX_HEIGHT),
        ),
      };
    }

    case "focus":
      return { ...state, focusMode: action.value };
  }
}

interface LayoutContextValue {
  state: LayoutState;
  dispatch: Dispatch<LayoutAction>;
  ready: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function WorkspaceLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(layoutReducer, DEFAULT_LAYOUT);
  const [ready, setReady] = useState(false);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (stored !== null) {
        dispatch({ type: "hydrate", value: decodeLayout(stored) });
      }
    } catch {
      // Storage may be unavailable in private browsing or restricted iframes.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    // Never write defaults on the first ready pass before hydration state settles.
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          LAYOUT_STORAGE_KEY,
          JSON.stringify({ ...state, focusMode: false }),
        );
      } catch {
        // Layout persistence must never interrupt workspace operation.
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [state, ready]);

  return (
    <LayoutContext.Provider value={{ state, dispatch, ready }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useWorkspaceLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error(
      "useWorkspaceLayout requires WorkspaceLayoutProvider",
    );
  }

  return context;
}
