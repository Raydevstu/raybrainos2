"use client";

import { useEffect, useState } from "react";
import { S, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

export function AgentsView() {
  useCortex();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  const lower = query.trim().toLowerCase();
  const agents = S.agents.filter((agent) => {
    if (statusFilter !== "all" && agent.status !== statusFilter) return false;
    if (!lower) return true;
    return (
      agent.name.toLowerCase().includes(lower) ||
      agent.domain.toLowerCase().includes(lower) ||
      agent.model.toLowerCase().includes(lower)
    );
  });

  return (
    <SecondaryShell
      title="Agents"
      description="Seeded custodian roster, configured model references, and autonomy metadata."
      statusNote="Showing seeded demo agent definitions without background simulation timers. Live agent orchestration connects in Batch 4."
    >
      <div className="rb-sec-toolbar">
        <div className="rb-search-wrap" style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <input
            type="search"
            className="rb-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter agents by name, domain, or model…"
            aria-label="Filter agents"
          />
        </div>

        {(["all", "idle", "working", "review"] as const).map((status) => (
          <button
            key={status}
            type="button"
            className="rb-sec-tab"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {agents.length === 0 ? (
        <div className="rb-sec-card">
          <p className="rb-sec-row-sub" style={{ margin: 0 }}>
            No seeded agents match your filter.
          </p>
        </div>
      ) : (
        <div className="rb-sec-grid">
          {agents.map((agent) => (
            <article className="rb-sec-card" key={agent.id}>
              <h2 className="rb-sec-card-title">
                <span>{agent.name}</span>
                <span className="rb-badge">{agent.status}</span>
              </h2>
              <p className="rb-sec-row-sub" style={{ margin: 0 }}>
                {agent.domain}
              </p>
              <div className="rb-sec-toolbar">
                <span className="rb-badge">{agent.model}</span>
                <span className="rb-badge">{agent.provider}</span>
                <span className="rb-badge">Autonomy {agent.autonomy}%</span>
              </div>
              {agent.task ? (
                <div className="rb-sec-row-sub">
                  Seeded task: {agent.task.title} ({agent.task.stepsDone}/
                  {agent.task.steps.length} steps)
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SecondaryShell>
  );
}
