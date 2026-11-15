"use client";

import { useEffect } from "react";
import { S, byId, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";
import { SettingsSubnav } from "./settings-subnav";

export function SettingsIntegrationsView() {
  useCortex();

  useEffect(() => {
    load();
  }, []);

  return (
    <SecondaryShell
      title="Settings · Integrations"
      description="MCP connectors, tool permissions, and agent allowlists."
      statusNote="Showing seeded connector definitions. Server OAuth connections and external MCP transport bridges connect in Batch 3–6."
      actions={<SettingsSubnav />}
    >
      <div className="rb-sec-list">
        {S.harness.connectors.map((connector) => (
          <div className="rb-sec-row" key={connector.id}>
            <div className="rb-sec-row-main">
              <div className="rb-sec-row-title">{connector.name}</div>
              <div className="rb-sec-row-sub">
                {connector.desc} · Auth mode: {connector.auth} · Allowed
                agents:{" "}
                {connector.allowedAgents
                  .map((id) => byId(id)?.name ?? id)
                  .join(", ")}
              </div>
            </div>
            <span className="rb-badge rb-badge-warn">
              Server bridge pending
            </span>
          </div>
        ))}
      </div>
    </SecondaryShell>
  );
}
