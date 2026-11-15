import type { Metadata } from "next";
import { SettingsProvidersView } from "@/components/workspace/secondary/settings-providers-view";

export const metadata: Metadata = {
  title: "Provider Settings · RayBrainOS2",
};

export default function SettingsProvidersPage() {
  return <SettingsProvidersView />;
}
