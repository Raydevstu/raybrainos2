"use client";

import { useEffect } from "react";
import { Play } from "lucide-react";
import { S, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

export function AutomationsView() {
  useCortex();

  useEffect(() => {
    load();
  }, []);

  return (
    <SecondaryShell
      title="Automations"
      description="Workflow definitions, trigger specifications, and execution pipeline steps."
      statusNote="Showing seeded demo workflow definitions. Automated background scheduling and live workflow execution are unavailable until Batch 4."
    >
      <div className="rb-sec-grid">
        {S.war.workflows.map((workflow) => (
          <article className="rb-sec-card" key={workflow.id}>
            <div className="rb-sec-card-title">
              <span>{workflow.name}</span>
              <span className="rb-badge rb-badge-warn">Scheduler offline</span>
            </div>
            <p className="rb-sec-row-sub" style={{ margin: 0 }}>
              {workflow.desc}
            </p>

            <div className="rb-sec-list" style={{ marginTop: 4 }}>
              {workflow.nodes.map((node, index) => (
                <div className="rb-sec-row" key={node.id}>
                  <div className="rb-sec-row-main">
                    <div className="rb-sec-row-title">
                      {index + 1}. {node.label}
                    </div>
                    <div className="rb-sec-row-sub">{node.detail}</div>
                  </div>
                  <span className="rb-badge">{node.kind}</span>
                </div>
              ))}
            </div>

            <div className="rb-sec-toolbar" style={{ marginTop: 4 }}>
              <button
                type="button"
                className="rb-button"
                disabled
                aria-disabled="true"
                title="Workflow runner connects in Batch 4"
              >
                <Play size={13} aria-hidden="true" />
                <span>Run unavailable (Batch 4)</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </SecondaryShell>
  );
}
