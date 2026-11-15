"use client";

import { useEffect } from "react";
import { S, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

export function GovernanceView() {
  useCortex();

  useEffect(() => {
    load();
  }, []);

  return (
    <SecondaryShell
      title="Governance"
      description="Phase gate sequence, project constraints, risks, and approval boundaries."
      statusNote="Displaying seeded Jarvis phase-gate rules. Authoritative server-side approval enforcement connects in Batch 3–4."
    >
      <section aria-label="Lifecycle phase gates">
        <h2 className="rb-sec-nav-heading" style={{ paddingLeft: 0 }}>
          Phase gates ({S.gov.project})
        </h2>
        <div className="rb-sec-list">
          {S.gov.phases.map((phase, index) => (
            <div className="rb-sec-row" key={phase.key}>
              <div className="rb-sec-row-main">
                <div className="rb-sec-row-title">
                  {index + 1}. {phase.label} · {phase.deliverable}
                </div>
                <div className="rb-sec-row-sub">
                  Custodian studio: {phase.studio} · Target: {phase.deadline}
                </div>
              </div>
              <span
                className={
                  phase.status === "blocked"
                    ? "rb-badge rb-badge-danger"
                    : phase.status === "review"
                      ? "rb-badge rb-badge-warn"
                      : "rb-badge"
                }
              >
                {phase.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="rb-sec-grid">
        <section className="rb-sec-card" aria-label="Project constraints">
          <h2 className="rb-sec-card-title">
            <span>Project constraints</span>
            <span className="rb-badge">{S.gov.constraints.length}</span>
          </h2>
          <div className="rb-sec-list">
            {S.gov.constraints.map((constraint) => (
              <div className="rb-sec-row" key={constraint}>
                <span className="rb-sec-row-title">{constraint}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rb-sec-card" aria-label="Tracked risks and blockers">
          <h2 className="rb-sec-card-title">
            <span>Risks &amp; blockers</span>
            <span className="rb-badge">
              {S.gov.risks.length} risks · {S.gov.blockers.length} blockers
            </span>
          </h2>
          <div className="rb-sec-list">
            {S.gov.risks.map((risk) => (
              <div className="rb-sec-row" key={risk.id}>
                <div className="rb-sec-row-main">
                  <div className="rb-sec-row-title">{risk.text}</div>
                </div>
                <span className="rb-badge rb-badge-warn">{risk.level}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SecondaryShell>
  );
}
