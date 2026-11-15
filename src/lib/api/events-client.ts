// events-client.ts — brain event stream (SourceCreated, ArtifactCreated, …).
// live mode: SSE against the events URL (WebSocket swap-in is a one-liner —
//            the handler shape is identical).
// demo mode: the store's activity emitter is the transport — the local
//            equivalent of polling, zero infrastructure. The UI cannot tell
//            the difference; both deliver CortexEvent objects.
import { isLive, cortexEnv } from './http';
import type { CortexEvent, CortexEventType } from './types';
import { onLogEvent, uid } from '@/components/cortex/cortex';

const kindMap: Record<string, CortexEventType> = {
  task: 'StudioStarted',
  artifact: 'ArtifactCreated',
  system: 'GraphUpdated'
};

/**
 * Subscribe to brain events. Returns an unsubscribe function.
 * Errors are reported through onError — never thrown — so a dead stream
 * degrades to non-blocking notification-feed events instead of crashes.
 */
export function subscribe(
  onEvent: (e: CortexEvent) => void,
  onError?: (err: Error) => void
): () => void {
  if (isLive()) {
    const url = cortexEnv().eventsUrl;
    if (!url) {
      onError?.(new Error('events URL is not configured'));
      return () => { /* nothing to clean up */ };
    }
    const es = new EventSource(url);
    es.onmessage = m => {
      try {
        const d = JSON.parse(m.data);
        onEvent({
          id: d.id ?? uid(),
          type: (d.type ?? 'GraphUpdated') as CortexEventType,
          agentId: d.agentId,
          projectId: d.projectId,
          title: d.title ?? '',
          at: d.at ?? new Date().toISOString()
        });
      } catch { /* skip malformed frame */ }
    };
    es.onerror = () => onError?.(new Error('event stream error — falling back to polling cadence'));
    return () => es.close();
  }
  // demo mode: bridge the store's activity log into CortexEvents.
  return onLogEvent(e => onEvent({
    id: uid(),
    type: kindMap[e.kind] ?? 'GraphUpdated',
    agentId: e.agentId,
    title: e.text,
    at: e.t
  }));
}
