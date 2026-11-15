import type { Metadata } from "next";
import { AutomationsView } from "@/components/workspace/secondary/automations-view";

export const metadata: Metadata = {
  title: "Automations · RayBrainOS2",
};

export default function AutomationsPage() {
  return <AutomationsView />;
}
