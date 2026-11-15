// chat-engine.ts — Jarvis conversation engine (War Room · Chat mode).
//
// DEMO ENGINE: replies are generated locally from live project state — never
// presented as real model output (every message carries the demo badge). In
// live mode the same reply slot is filled by the gateway stream
// (lib/gateway-client.ts) — the UI cannot tell the difference.
//
// Doctrine (constitution v2): conversations become actions. Every Jarvis reply
// can emit Action Cards — one click = one real state change + audit receipt:
// [Run in Terminal] [Open in Browser Deck] [Create Task] [Ingest to Vault]
// [Route to Squad] [Launch Workflow].
import {
  S, uid, now, log, emit, save, sfx, pushChatMessage,
  routeCommand, currentPhase, type ChatAction, type WikiPage
} from '@/components/cortex/cortex';
import { resolveRoute } from '@/lib/model-router';

/** Quick-prompt chips rendered under the chat input. */
export const CHAT_SUGGESTIONS = [
  'Research the competitor pricing and save findings',
  'Route development: build the login form',
  'Run the competitor watch workflow',
  '@Agent Routing — how does directive routing work?',
  'Send the Research Squad after the pricing hypothesis'
];

interface BuiltReply { text: string; tools: string[]; actions: ChatAction[]; cites: string[] }

const mk = (kind: ChatAction['kind'], label: string, payload: string, target?: string): ChatAction =>
  ({ id: 'ca' + uid(), kind, label, payload, target });

/** Parse @mentions into wiki pages used to ground the reply. */
function mentionedPages(text: string): WikiPage[] {
  const terms = [...text.matchAll(/@([\w][\w-]*)/g)].map(m => m[1].toLowerCase());
  if (!terms.length) return [];
  return S.wiki.filter(w => {
    const t = w.title.toLowerCase().replace(/\s+/g, '-');
    return terms.some(m => t.includes(m) || w.title.toLowerCase().includes(m));
  }).slice(0, 4);
}

/** Compose the demo Jarvis reply from intent + live state. Always honest, always grounded. */
function buildReply(text: string, citedPages: WikiPage[]): BuiltReply {
  const low = text.toLowerCase();
  const routed = routeCommand(text);
  const route = resolveRoute(routed.agent.id);
  const model = route?.model ?? S.modelProfile.mainModel;
  const provider = route?.provider.name ?? 'gateway';
  const chain = route?.fellBack ? ` (fallback chain engaged: ${route.chain.join(' → ')})` : '';
  const grounding = citedPages.length
    ? ` Grounded on ${citedPages.length} wiki page${citedPages.length === 1 ? '' : 's'}: ${citedPages.map(p => p.title).join(' · ')}.`
    : '';
  const tools = [
    `model-router → ${routed.agent.name}`,
    `gateway → ${model} @ ${provider}${chain}`,
    `vault → ${S.sources.length} raw sources · ${S.metrics.pages} wiki pages`
  ];
  const cites = citedPages.map(p => p.title);
  const phase = currentPhase();
  const pending = S.artifacts.filter(x => x.state === 'pending').length;

  if (/research|competitor|pricing|market|scan|findings|browse|web agent/.test(low)) {
    return {
      tools, cites,
      text: `Objective parsed as a research task. Doctrine: evidence first — I will ground the Web Agent on the vault (${S.sources.length} sources, ${S.metrics.pages} pages), run it read-only, and everything it extracts flows through the Chief Librarian's 11-stage pipeline as a raw, immutable source.${grounding} Route: ${model} @ ${provider}.${chain} You are in ${phase} phase — findings land as pending artifacts (${pending} queued) and arm the gate.`,
      actions: [
        mk('browser', 'Open in Browser Deck', text),
        mk('squad', 'Route to Research Squad', text, 'sq-research'),
        mk('task', 'Create Task', `Research: ${text.slice(0, 64)}`)
      ]
    };
  }
  if (/build|code|implement|scaffold|fix|api|endpoint|component|login|form/.test(low)) {
    return {
      tools, cites,
      text: `Build directive accepted for ${routed.agent.name}. Contracts before code — the studio pulls the approved OpenAPI spec and design system from the Brain, and every file lands as a reviewable artifact at the ${phase} gate. Route: ${model} @ ${provider}.${chain}`,
      actions: [
        mk('terminal', 'Run in Terminal', `route ${routed.agent.id} ${text.slice(0, 60)}`),
        mk('squad', 'Route to Development Squad', text, 'sq-dev'),
        mk('task', 'Create Task', `Build: ${text.slice(0, 64)}`)
      ]
    };
  }
  if (/design|wireframe|screen|ux|ui|mockup/.test(low)) {
    return {
      tools, cites,
      text: `Design directive routed to ${routed.agent.name}. Flows first, pixels second — wireframes and the component map sync to the Brain for Architecture. Route: ${model} @ ${provider}.${chain}`,
      actions: [
        mk('terminal', 'Run in Terminal', `route ${routed.agent.id} ${text.slice(0, 60)}`),
        mk('task', 'Create Task', `Design: ${text.slice(0, 64)}`)
      ]
    };
  }
  if (/workflow|automat|watch|digest|schedule|pipeline/.test(low)) {
    return {
      tools, cites,
      text: `Automation it is. The competitor watch workflow chains trigger → model call (gateway) → browser task (read-only) → Librarian ingest → artifact. Every step lands in the Jobs queue with tokens and cost. Launch it, or edit the graph in Automations first.`,
      actions: [
        mk('workflow', 'Launch Workflow', 'Competitor watch', 'wf-watch'),
        mk('workflow', 'Launch Gate Digest', 'Gate digest', 'wf-digest'),
        mk('task', 'Create Task', `Automate: ${text.slice(0, 64)}`)
      ]
    };
  }
  if (/ingest|remember|source|note|wiki|knowledge/.test(low)) {
    return {
      tools, cites,
      text: `The Librarian handles intake: raw preserved immutably → classified → entities + concepts extracted → wiki rippled → graph + index synced → audit receipt. Nothing enters the Brain except through that pipeline. Route: auxiliary model (extraction).`,
      actions: [
        mk('ingest', 'Ingest to Vault', text.slice(0, 80)),
        mk('terminal', 'Run in Terminal', `ingest ${text.slice(0, 48)}`)
      ]
    };
  }
  if (/approve|gate|phase|ship|release/.test(low)) {
    return {
      tools, cites,
      text: `Gate status: ${phase} phase, ${pending} artifact${pending === 1 ? '' : 's'} pending review. Jarvis owns transitions — approve from the Task Context panel on the right (or the MainBrain workspace) and the next studio starts automatically. Studios never skip gates.`,
      actions: [mk('task', 'Track it as a Task', `Approve the ${phase} gate`)]
    };
  }
  if (/squad|team|youtube/.test(low)) {
    const sq = /youtube/.test(low) ? 'sq-youtube' : /dev/.test(low) ? 'sq-dev' : 'sq-research';
    const squad = S.war.squads.find(s => s.id === sq);
    return {
      tools, cites,
      text: `${squad?.name ?? 'The squad'} is on standby: ${squad?.members.map(m => m.name).join(' · ') ?? 'members wired'}. Runs are governed — outputs arrive as artifacts at the ${phase} gate, and per-agent tokens + cost roll up live. Budget: $${squad?.budgetUsd.toFixed(2) ?? '2.00'} per run.`,
      actions: [
        mk('squad', 'Route to Squad', text, sq),
        mk('task', 'Create Task', `Squad objective: ${text.slice(0, 60)}`)
      ]
    };
  }
  if (/theme|dark|light|look/.test(low)) {
    return {
      tools, cites,
      text: `Six presets ship with the OS: Cortex Midnight, NotebookLM, Hermes Navy, DeepSeek, Terminal Harness, Graphite Pro. Apply from the palette in the top bar — every surface, including this War Room, re-themes instantly.`,
      actions: [mk('terminal', 'Run in Terminal', 'theme harness')]
    };
  }
  // default: route acknowledgement with the universal action set
  return {
    tools, cites,
    text: `Directive acknowledged. Routing to ${routed.agent.name} (${routed.agent.domain}) via ${model} @ ${provider}.${chain} You are in ${phase} phase — ${pending} artifact${pending === 1 ? '' : 's'} pending at the gate.${grounding} I can turn this into an action:`,
    actions: [
      mk('task', 'Create Task', text.slice(0, 80)),
      mk('terminal', 'Run in Terminal', `route ${routed.agent.id} ${text.slice(0, 60)}`),
      mk('browser', 'Open in Browser Deck', text.slice(0, 80))
    ]
  };
}

let chatTimer: number | null = null;

/**
 * Send a message to Jarvis. Demo engine streams a locally-generated reply
 * (badged DEMO); the stream shape matches the live gateway stream exactly.
 * @mentions ground the reply on wiki pages.
 */
export function sendJarvisChat(raw: string) {
  const text = raw.trim();
  if (!text || S.war.chatStreaming) return;
  const citedPages = mentionedPages(text);
  pushChatMessage({ id: 'cm' + uid(), role: 'you', text, at: now() });
  sfx.send();
  log('mainbrain', `You → Jarvis: ${text}`, 'task');

  const reply = buildReply(text, citedPages);
  const msgId = 'cm' + uid();
  pushChatMessage({ id: msgId, role: 'jarvis', text: '', at: now(), streaming: true, demo: true });
  S.war.chatStreaming = true;
  emit();

  const words = reply.text.split(' ');
  let i = 0;
  const step = () => {
    const m = S.war.chat.find(x => x.id === msgId);
    if (!m) { S.war.chatStreaming = false; return; } // chat cleared mid-stream
    const chunk = words.slice(i, i + 3).join(' ');
    i += 3;
    m.text = m.text ? `${m.text} ${chunk}` : chunk;
    emit();
    if (i < words.length) {
      chatTimer = window.setTimeout(step, 70 + Math.random() * 110);
    } else {
      m.streaming = false;
      m.tools = reply.tools;
      m.actions = reply.actions;
      m.cites = reply.cites;
      m.mentions = citedPages.map(p => p.title);
      S.war.chatStreaming = false;
      sfx.done();
      log('mainbrain', `Jarvis replied — ${reply.actions.length} action card(s) attached.`, 'system', 'Conversations become actions');
      emit(); save();
    }
  };
  if (chatTimer) window.clearTimeout(chatTimer);
  chatTimer = window.setTimeout(step, 380 + Math.random() * 320); // "thinking" latency
}
