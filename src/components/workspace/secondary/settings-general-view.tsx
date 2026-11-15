"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cortexEnv } from "@/lib/api/http";
import {
  DEFAULT_LAYOUT,
  DRAFT_STORAGE_KEY,
  LAYOUT_STORAGE_KEY,
  decodeLayout,
  type LayoutState,
} from "@/lib/workspace/layout-state";
import { SecondaryShell } from "./secondary-shell";
import { SettingsSubnav } from "./settings-subnav";

export function SettingsGeneralView() {
  const env = cortexEnv();
  const [savedLayout, setSavedLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [hasDraft, setHasDraft] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSavedLayout(
        decodeLayout(window.localStorage.getItem(LAYOUT_STORAGE_KEY)),
      );
      setHasDraft(Boolean(window.localStorage.getItem(DRAFT_STORAGE_KEY)));
    } catch {
      // Storage unavailable.
    }
  }, []);

  const resetLocalPreferences = () => {
    try {
      window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSavedLayout({ ...DEFAULT_LAYOUT });
      setHasDraft(false);
      setResetNotice("Local layout preferences and unsent draft cleared.");
    } catch {
      setResetNotice("Unable to access browser local storage.");
    }
  };

  return (
    <SecondaryShell
      title="Settings · General"
      description="Environment mode and local workspace layout preferences."
      statusNote="Workspace layout preferences persist locally per browser. Server-synced user settings arrive in Batch 3."
      actions={<SettingsSubnav />}
    >
      <section className="rb-sec-card" aria-label="Environment mode">
        <h2 className="rb-sec-card-title">
          <span>Runtime environment</span>
          <span className="rb-badge">{env.mode}</span>
        </h2>
        <div className="rb-sec-row-sub">
          Brain service URL:{" "}
          {env.brainServiceUrl || "Not configured (Batch 3+ endpoint)"}
        </div>
        <div className="rb-sec-row-sub">
          Events stream URL:{" "}
          {env.eventsUrl || "Not configured (Batch 4 SSE endpoint)"}
        </div>
      </section>

      <section className="rb-sec-card" aria-label="Local layout preferences">
        <h2 className="rb-sec-card-title">
          <span>Saved workspace layout</span>
          <button
            type="button"
            className="rb-button"
            onClick={resetLocalPreferences}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reset local state</span>
          </button>
        </h2>

        <div className="rb-sec-list">
          <div className="rb-sec-row">
            <span className="rb-sec-row-title">Left sidebar</span>
            <span className="rb-badge">
              {savedLayout.leftOpen ? "Open" : "Closed"} ·{" "}
              {savedLayout.leftView} · {savedLayout.leftWidth}px
            </span>
          </div>
          <div className="rb-sec-row">
            <span className="rb-sec-row-title">Right sidebar</span>
            <span className="rb-badge">
              {savedLayout.rightOpen ? "Open" : "Closed"} ·{" "}
              {savedLayout.rightView} · {savedLayout.rightWidth}px
            </span>
          </div>
          <div className="rb-sec-row">
            <span className="rb-sec-row-title">Terminal drawer</span>
            <span className="rb-badge">
              {savedLayout.terminalOpen ? "Open" : "Closed"} ·{" "}
              {savedLayout.terminalHeight}px
            </span>
          </div>
          <div className="rb-sec-row">
            <span className="rb-sec-row-title">Unsent chat draft</span>
            <span className="rb-badge">
              {hasDraft ? "Saved locally" : "Empty"}
            </span>
          </div>
        </div>

        {resetNotice ? (
          <p className="rb-sec-row-sub" role="status" style={{ margin: 0 }}>
            {resetNotice}
          </p>
        ) : null}
      </section>
    </SecondaryShell>
  );
}
