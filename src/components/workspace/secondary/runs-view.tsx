"use client";

import { useEffect, useState } from "react";
import { S, byId, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

type ActivityKindFilter = "all" | "system" | "task" | "artifact";

export function RunsView() {
  useCortex();
  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>("all");

  useEffect(() => {
    load();
  }, []);

  const events = S.activity.filter(
    (entry) => kindFilter === "all" || entry.kind === kindFilter,
  );

  return (
    <SecondaryShell
      title="Runs"
      description="Execution log, run queue status, and knowledge synchronization receipts."
      statusNote="Durable server-side Run and RunEvent persistence connects in Batch 3–4. No background simulation jobs are fabricated."
    >
      <section className="rb-sec-card" aria-label="Durable run engine status">
        <h2 className="rb-sec-card-title">
          <span>Server run queue</span>
          <span className="rb-badge rb-badge-warn">Unavailable</span>
        </h2>
        <p className="rb-sec-row-sub" style={{ margin: 0 }}>
          {S.war.jobs.length > 0
            ? `${S.war.jobs.length} locally saved demo jobs present from prior legacy sessions.`
            : "0 active server runs. Real queued, running, and cancellable runs require the Batch 4 run orchestrator."}
        </p>
      </section>

      <div className="rb-sec-toolbar">
        {(["all", "system", "task", "artifact"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className="rb-sec-tab"
            aria-pressed={kindFilter === kind}
            onClick={() => setKindFilter(kind)}
          >
            {kind}
          </button>
        ))}
      </div>

      <section aria-label="Seeded activity log">
        <h2 className="rb-sec-nav-heading" style={{ paddingLeft: 0 }}>
          Seeded activity &amp; receipts
        </h2>
        <div className="rb-sec-list">
          {events.map((entry, idx) => {
            const actor = byId(entry.agentId);
            return (
              <div className="rb-sec-row" key={`${entry.t}-${idx}`}>
                <div className="rb-sec-row-main">
                  <div className="rb-sec-row-title">
                    {actor?.name ?? entry.agentId} — {entry.text}
                  </div>
                  <div className="rb-sec-row-sub">
                    Time: {entry.t}
                    {entry.flow ? ` · Flow: ${entry.flow}` : ""}
                  </div>
                </div>
                <span className="rb-badge">{entry.kind}</span>
              </div>
            );
          })}
          {events.length === 0 ? (
            <div className="rb-sec-row">
              <span className="rb-sec-row-sub">No events for this filter.</span>
            </div>
          ) : null}
        </div>
      </section>
    </SecondaryShell>
  );
}
