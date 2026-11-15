"use client";

import { useEffect, useState } from "react";
import { S, load, useCortex, type WikiPage } from "@/components/cortex/cortex";
import { SecondaryShell } from "./secondary-shell";

type KnowledgeSectionTab = "wiki" | "sources" | "artifacts" | "audit";

export function KnowledgeView() {
  useCortex();
  const [tab, setTab] = useState<KnowledgeSectionTab>("wiki");
  const [query, setQuery] = useState("");
  const [selectedWiki, setSelectedWiki] = useState<WikiPage | null>(null);

  useEffect(() => {
    load();
  }, []);

  const lower = query.trim().toLowerCase();
  const wikiPages = S.wiki.filter((page) => {
    if (!lower) return true;
    return (
      page.title.toLowerCase().includes(lower) ||
      page.summary.toLowerCase().includes(lower) ||
      page.type.toLowerCase().includes(lower)
    );
  });

  const activeWiki =
    selectedWiki ?? (wikiPages.length > 0 ? wikiPages[0] : null);

  return (
    <SecondaryShell
      title="Knowledge"
      description="Librarian synthesized wiki pages, immutable raw sources, artifacts, and audit findings."
      statusNote="Displaying seeded local Librarian data. Live vector indexing and server Brain ingestion connect in Batch 3–4."
    >
      <div className="rb-sec-toolbar">
        <div
          className="rb-search-wrap"
          style={{ flex: "1 1 220px", maxWidth: 320 }}
        >
          <input
            type="search"
            className="rb-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter wiki pages…"
            aria-label="Filter knowledge wiki"
          />
        </div>

        {(
          [
            { id: "wiki", label: `Wiki (${S.wiki.length})` },
            { id: "sources", label: `Sources (${S.sources.length})` },
            { id: "artifacts", label: `Artifacts (${S.artifacts.length})` },
            {
              id: "audit",
              label: `Audit (${S.findings.filter((f) => f.status === "open").length})`,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className="rb-sec-tab"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "wiki" ? (
        <div className="rb-sec-grid">
          <div className="rb-sec-list">
            {wikiPages.map((page) => {
              const active = activeWiki?.title === page.title;
              return (
                <button
                  key={page.title}
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
                  onClick={() => setSelectedWiki(page)}
                >
                  <div className="rb-sec-row-main">
                    <div className="rb-sec-row-title">{page.title}</div>
                    <div className="rb-sec-row-sub">Updated {page.updated}</div>
                  </div>
                  <span className="rb-badge">{page.type}</span>
                </button>
              );
            })}
            {wikiPages.length === 0 ? (
              <div className="rb-sec-row">
                <span className="rb-sec-row-sub">No matching wiki pages.</span>
              </div>
            ) : null}
          </div>

          {activeWiki ? (
            <article className="rb-sec-card">
              <h2 className="rb-sec-card-title">
                <span>{activeWiki.title}</span>
                <span className="rb-badge">{activeWiki.type}</span>
              </h2>
              <p className="rb-sec-row-sub" style={{ margin: 0 }}>
                {activeWiki.summary}
              </p>
              <div className="rb-sec-toolbar">
                {activeWiki.links.map((linkTitle) => (
                  <span key={linkTitle} className="rb-badge">
                    Links: {linkTitle}
                  </span>
                ))}
                {(activeWiki.citations ?? []).map((srcId) => (
                  <span key={srcId} className="rb-badge rb-badge-warn">
                    Citation: {srcId}
                  </span>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {tab === "sources" ? (
        <div className="rb-sec-list">
          {S.sources.map((src) => (
            <div className="rb-sec-row" key={src.id}>
              <div className="rb-sec-row-main">
                <div className="rb-sec-row-title">{src.title}</div>
                <div className="rb-sec-row-sub">{src.note}</div>
              </div>
              <div className="rb-sec-toolbar">
                <span className="rb-badge">{src.kind}</span>
                <span className="rb-badge">{src.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "artifacts" ? (
        <div className="rb-sec-list">
          {S.artifacts.map((artifact) => (
            <div className="rb-sec-row" key={artifact.id}>
              <div className="rb-sec-row-main">
                <div className="rb-sec-row-title">{artifact.title}</div>
                <div className="rb-sec-row-sub">
                  {artifact.agentName} · {artifact.kind} · {artifact.created}
                </div>
              </div>
              <span className="rb-badge">{artifact.state}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="rb-sec-list">
          {S.findings.map((finding) => (
            <div className="rb-sec-row" key={finding.id}>
              <div className="rb-sec-row-main">
                <div className="rb-sec-row-title">{finding.target}</div>
                <div className="rb-sec-row-sub">{finding.detail}</div>
              </div>
              <div className="rb-sec-toolbar">
                <span className="rb-badge">{finding.kind}</span>
                <span className="rb-badge rb-badge-warn">
                  {finding.severity}
                </span>
                <span className="rb-badge">{finding.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SecondaryShell>
  );
}
