"use client";

import { useEffect, useState } from "react";
import { FolderKanban } from "lucide-react";
import { S, load, useCortex } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

export function ProjectsView() {
  useCortex();
  const [selectedFile, setSelectedFile] = useState<string | null>(
    S.harness.files[0]?.path ?? null,
  );

  useEffect(() => {
    load();
  }, []);

  const file =
    S.harness.files.find((entry) => entry.path === selectedFile) ??
    S.harness.files[0] ??
    null;

  return (
    <SecondaryShell
      title="Projects"
      description="Project scope, workspace bindings, and seeded session artifacts."
      statusNote="Real multi-project switching and authorized filesystem bindings connect in Batch 3–5. Below shows the preserved Solar CRM demo seed."
      actions={
        <button
          type="button"
          className="rb-button"
          disabled
          aria-disabled="true"
          title="Server workspace creation connects in Batch 3"
        >
          <FolderKanban size={14} aria-hidden="true" />
          <span>Connect repository (Batch 3)</span>
        </button>
      }
    >
      <section className="rb-sec-card" aria-label="Active demo project">
        <h2 className="rb-sec-card-title">
          <span>{S.gov.project}</span>
          <span className="rb-badge rb-badge-warn">Seeded demo project</span>
        </h2>
        <p className="rb-sec-row-sub">{S.gov.objective}</p>
        <div className="rb-sec-toolbar">
          <span className="rb-badge">
            Active phase:{" "}
            {S.gov.phases[S.gov.phaseIdx]?.label ?? "Unassigned"}
          </span>
          <span className="rb-badge">
            Sessions: {S.harness.sessions.length}
          </span>
          <span className="rb-badge">
            Seeded artifacts: {S.harness.files.length}
          </span>
        </div>
      </section>

      <section aria-label="Seeded harness sessions">
        <h2 className="rb-sec-nav-heading" style={{ paddingLeft: 0 }}>
          Demo sessions
        </h2>
        <div className="rb-sec-list">
          {S.harness.sessions.map((session) => (
            <div className="rb-sec-row" key={session.id}>
              <div className="rb-sec-row-main">
                <div className="rb-sec-row-title">{session.name}</div>
                <div className="rb-sec-row-sub">
                  Project: {session.project} · Profile: {session.profileName} ·{" "}
                  {session.agents.length} bound agents · Created{" "}
                  {session.created}
                </div>
              </div>
              <span className="rb-badge">{session.sandbox}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Seeded project files">
        <h2 className="rb-sec-nav-heading" style={{ paddingLeft: 0 }}>
          Seeded artifact files (read-only preview)
        </h2>
        <div className="rb-sec-grid">
          <div className="rb-sec-list">
            {S.harness.files.map((item) => {
              const active = file?.path === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  className="rb-sec-row"
                  style={{
                    width: "100%",
                    border: 0,
                    borderBottom: "1px solid var(--rb-border-subtle)",
                    background: active ? "var(--rb-surface)" : "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  aria-pressed={active}
                  onClick={() => setSelectedFile(item.path)}
                >
                  <div className="rb-sec-row-main">
                    <div className="rb-sec-row-title">{item.path}</div>
                    <div className="rb-sec-row-sub">
                      {item.kind} · by {item.createdBy}
                    </div>
                  </div>
                  <span className="rb-badge">{item.review}</span>
                </button>
              );
            })}
          </div>

          {file ? (
            <div className="rb-sec-card">
              <h3 className="rb-sec-card-title">
                <span>{file.path}</span>
                <span className="rb-badge">{file.lang}</span>
              </h3>
              <pre className="rb-sec-code">{file.content}</pre>
            </div>
          ) : null}
        </div>
      </section>
    </SecondaryShell>
  );
}
