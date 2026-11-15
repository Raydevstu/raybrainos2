"use client";

import { SecondaryShell } from "./secondary-shell";
import { SettingsSubnav } from "./settings-subnav";

const SECURITY_BOUNDARIES = [
  {
    title: "Server-side credentials",
    detail:
      "Model provider API keys stay strictly on the server (process.env.*). Browser components only receive authorized metadata and key reference labels.",
    status: "Enforced by architecture (Live gateway in Batch 3–4)",
  },
  {
    title: "Workspace root & symlink containment",
    detail:
      "All file tree listings, reads, and revision-checked writes must resolve within an authorized workspace root and block path traversal or symlink escapes.",
    status: "Workspace file API connects in Batch 3 & 5",
  },
  {
    title: "Isolated runtime for terminal & browser",
    detail:
      "Terminal PTY sessions and remote browser sessions run in constrained project runtimes rather than inheriting unrestricted application server secrets.",
    status: "Runtime gateway connects in Batch 6 & 9",
  },
  {
    title: "Approval policy for tool actions",
    detail:
      "High-risk file modifications, command executions, and sensitive browser operations require explicit approval tied to an exact action payload and revision.",
    status: "Approval service connects in Batch 3–4",
  },
];

export function SettingsSecurityView() {
  return (
    <SecondaryShell
      title="Settings · Security"
      description="Credential isolation, runtime containment, and tool approval boundaries."
      statusNote="No raw API keys or client secrets are accepted or persisted in the browser. Workspace authorization endpoints connect in Batch 3."
      actions={<SettingsSubnav />}
    >
      <div className="rb-sec-list">
        {SECURITY_BOUNDARIES.map((item) => (
          <div className="rb-sec-row" key={item.title}>
            <div className="rb-sec-row-main">
              <div className="rb-sec-row-title">{item.title}</div>
              <div className="rb-sec-row-sub">{item.detail}</div>
            </div>
            <span className="rb-badge">{item.status}</span>
          </div>
        ))}
      </div>
    </SecondaryShell>
  );
}
