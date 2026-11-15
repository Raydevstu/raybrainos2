import type { Metadata } from "next";
import { SettingsGeneralView } from "@/components/workspace/secondary/settings-general-view";

export const metadata: Metadata = {
  title: "General Settings · RayBrainOS2",
};

export default function SettingsGeneralPage() {
  return <SettingsGeneralView />;
}
