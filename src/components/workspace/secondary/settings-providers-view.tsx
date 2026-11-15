"use client";

import { useEffect } from "react";
import { S, load, useCortex } from "@/components/cortex/cortex";
import { describeMode, providerGroups } from "@/lib/provider-gateway";
import { SecondaryShell } from "./secondary-shell";
import { SettingsSubnav } from "./settings-subnav";

export function SettingsProvidersView() {
  useCortex();

  useEffect(() => {
    load();
  }, []);

  const groups = providerGroups();
  const sections = [
    { label: "Accounts", list: groups.accounts },
    { label: "API key references", list: groups.apiKeys },
    { label: "Custom endpoints", list: groups.custom },
    { label: "Local models", list: groups.local },
  ];

  return (
    <SecondaryShell
      title="Settings · Providers"
      description="Provider gateway catalog, key reference policy, and model routing profile."
      statusNote="Provider connectivity is unverified in Batch 2: live health probing and server-side credential resolution connect in Batch 3–4. Raw API keys are never stored in the browser."
      actions={<SettingsSubnav />}
    >
      <section className="rb-sec-card" aria-label="Model routing profile">
        <h2 className="rb-sec-card-title">
          <span>Model routing profile ({S.modelProfile.name})</span>
          <span className="rb-badge rb-badge-warn">Config reference</span>
        </h2>
        <div className="rb-sec-toolbar">
          <span className="rb-badge">Main: {S.modelProfile.mainModel}</span>
          <span className="rb-badge">
            Auxiliary: {S.modelProfile.auxiliaryModel}
          </span>
          <span className="rb-badge">
            Fallbacks: {S.modelProfile.fallbackModels.join(" → ")}
          </span>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.label} aria-label={section.label}>
          <h2 className="rb-sec-nav-heading" style={{ paddingLeft: 0 }}>
            {section.label}
          </h2>
          <div className="rb-sec-list">
            {section.list.map((provider) => (
              <div className="rb-sec-row" key={provider.id}>
                <div className="rb-sec-row-main">
                  <div className="rb-sec-row-title">{provider.name}</div>
                  <div className="rb-sec-row-sub">
                    {describeMode(provider.apiMode)} · {provider.baseUrl} · Ref:{" "}
                    {provider.apiKeyRef ?? "Server env"}
                  </div>
                </div>
                <div className="rb-sec-toolbar">
                  <span className="rb-badge">
                    {provider.models.length} model
                    {provider.models.length === 1 ? "" : "s"}
                  </span>
                  <span className="rb-badge rb-badge-warn">
                    Unverified (Demo config)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </SecondaryShell>
  );
}
