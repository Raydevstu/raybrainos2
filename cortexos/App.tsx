// App.tsx — CortexOS root component.
//
// The whole OS mounts as one fixed shell: fixed top bar, OS rail, Agent-Bot
// Dock, MainBrain neural map, War Room strip, summonable workspaces,
// overlays (War Room / Roster / Librarian HQ / Harness / Settings), modals,
// notification drawer and toasts. No router — agent domains open only when
// summoned from the dock, per the product constitution.
import CortexOS from './components/cortex-os';

export default function App() {
  return <CortexOS />;
}
