import type { Metadata } from "next";
import { GovernanceView } from "@/components/workspace/secondary/governance-view";

export const metadata: Metadata = {
  title: "Governance · RayBrainOS2",
};

export default function GovernancePage() {
  return <GovernanceView />;
}
