export type SecondaryNavIcon =
  | "folder-kanban"
  | "bot"
  | "workflow"
  | "book-open"
  | "activity"
  | "shield-check"
  | "sliders"
  | "cpu"
  | "plug"
  | "lock";

export interface SecondaryNavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  group: "workspace" | "settings";
  icon: SecondaryNavIcon;
}

export const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  {
    href: "/projects",
    label: "Projects",
    shortLabel: "Projects",
    description: "Active workspace scope, sessions, and file deliverables",
    group: "workspace",
    icon: "folder-kanban",
  },
  {
    href: "/agents",
    label: "Agents",
    shortLabel: "Agents",
    description: "Custodian roster, roles, and model routing overrides",
    group: "workspace",
    icon: "bot",
  },
  {
    href: "/automations",
    label: "Automations",
    shortLabel: "Automations",
    description: "Workflow definitions and scheduled execution pipelines",
    group: "workspace",
    icon: "workflow",
  },
  {
    href: "/knowledge",
    label: "Knowledge",
    shortLabel: "Knowledge",
    description: "Librarian wiki pages, raw sources, artifacts, and audit",
    group: "workspace",
    icon: "book-open",
  },
  {
    href: "/runs",
    label: "Runs",
    shortLabel: "Runs",
    description: "Execution activity log and run history",
    group: "workspace",
    icon: "activity",
  },
  {
    href: "/governance",
    label: "Governance",
    shortLabel: "Governance",
    description: "Approval gates, lifecycle phases, risks, and constraints",
    group: "workspace",
    icon: "shield-check",
  },
  {
    href: "/settings/general",
    label: "General Settings",
    shortLabel: "General",
    description: "Runtime mode and local workspace layout preferences",
    group: "settings",
    icon: "sliders",
  },
  {
    href: "/settings/providers",
    label: "Providers",
    shortLabel: "Providers",
    description: "Model gateway providers, routing profile, and fallback chain",
    group: "settings",
    icon: "cpu",
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    shortLabel: "Integrations",
    description: "MCP connectors and tool permission boundaries",
    group: "settings",
    icon: "plug",
  },
  {
    href: "/settings/security",
    label: "Security",
    shortLabel: "Security",
    description: "Credential isolation, approval policy, and sandbox controls",
    group: "settings",
    icon: "lock",
  },
];

export const WORKSPACE_SECONDARY_ITEMS = SECONDARY_NAV_ITEMS.filter(
  (item) => item.group === "workspace",
);

export const SETTINGS_SECONDARY_ITEMS = SECONDARY_NAV_ITEMS.filter(
  (item) => item.group === "settings",
);
