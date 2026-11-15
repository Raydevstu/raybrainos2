import {
  Activity,
  BookOpen,
  Bot,
  Cpu,
  FolderKanban,
  Lock,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import type { SecondaryNavIcon } from "@/lib/workspace/navigation";

export function SecondaryIcon({
  name,
  size = 14,
}: {
  name: SecondaryNavIcon;
  size?: number;
}) {
  switch (name) {
    case "folder-kanban":
      return <FolderKanban size={size} aria-hidden="true" />;
    case "bot":
      return <Bot size={size} aria-hidden="true" />;
    case "workflow":
      return <Workflow size={size} aria-hidden="true" />;
    case "book-open":
      return <BookOpen size={size} aria-hidden="true" />;
    case "activity":
      return <Activity size={size} aria-hidden="true" />;
    case "shield-check":
      return <ShieldCheck size={size} aria-hidden="true" />;
    case "sliders":
      return <SlidersHorizontal size={size} aria-hidden="true" />;
    case "cpu":
      return <Cpu size={size} aria-hidden="true" />;
    case "plug":
      return <Plug size={size} aria-hidden="true" />;
    case "lock":
      return <Lock size={size} aria-hidden="true" />;
  }
}
