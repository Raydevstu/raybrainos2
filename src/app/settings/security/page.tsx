import type { Metadata } from "next";
import { SettingsSecurityView } from "@/components/workspace/secondary/settings-security-view";

export const metadata: Metadata = {
  title: "Security Settings · RayBrainOS2",
};

export default function SettingsSecurityPage() {
  return <SettingsSecurityView />;
}
