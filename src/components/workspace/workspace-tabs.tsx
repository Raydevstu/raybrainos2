"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageSquare } from "lucide-react";
import { DRAFT_STORAGE_KEY } from "@/lib/workspace/layout-state";

export function WorkspaceTabs() {
  const [draft, setDraft] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        setDraft(saved);
      }
    } catch {
      // Storage may be unavailable; in-memory draft continues to work.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (draft) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, draft);
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // Storage write failure must never interrupt typing.
    }
  }, [draft]);

  return (
    <div className="rb-work-area rb-workspace-tabs">
      <div className="rb-tabs-bar">
        <div
          className="rb-tabs-list"
          role="tablist"
          aria-label="Workspace tabs"
        >
          <button
            type="button"
            role="tab"
            id="rb-tab-chat"
            aria-selected="true"
            aria-controls="rb-tabpanel-chat"
            className="rb-center-tab"
          >
            <MessageSquare size={13} aria-hidden="true" />
            <span>Chat</span>
          </button>
        </div>

        <span className="rb-tab-meta">Files open here when connected</span>
      </div>

      <section
        id="rb-tabpanel-chat"
        role="tabpanel"
        aria-labelledby="rb-tab-chat"
        aria-label="Chat"
        className="rb-tabpanel"
      >
        <div className="rb-chat-layout">
          <div className="rb-chat-stage">
            <h1 className="rb-chat-heading">What should we work on?</h1>
            <p className="rb-chat-subtext">
              No model provider or project runtime is connected yet. You can
              keep a local draft below while chat execution is unavailable.
            </p>
          </div>

          <form
            className="rb-composer"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <textarea
              className="rb-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Draft a message to RayBrain…"
              aria-label="Message draft"
              rows={2}
            />
            <div className="rb-composer-foot">
              <span className="rb-composer-note">
                Sending unavailable until a model provider is connected
              </span>
              <button
                type="submit"
                className="rb-send-button"
                disabled
                aria-disabled="true"
                title="Sending is unavailable until a model provider is connected"
              >
                <span>Send</span>
                <ArrowUp size={13} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
