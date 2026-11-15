import type { Metadata } from "next";
import { SettingsIntegrationsView } from "@/components/workspace/secondary/settings-integrations-view";

export const metadata: Metadata = {
  title: "Integrations Settings · RayBrainOS2",
};

export default function SettingsIntegrationsPage() {
  return <SettingsIntegrationsView />;
}
