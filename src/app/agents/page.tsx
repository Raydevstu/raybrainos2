import type { Metadata } from "next";
import { AgentsView } from "@/components/workspace/secondary/agents-view";

export const metadata: Metadata = {
  title: "Agents · RayBrainOS2",
};

export default function AgentsPage() {
  return <AgentsView />;
}
