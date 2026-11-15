import type { Metadata } from "next";
import { RunsView } from "@/components/workspace/secondary/runs-view";

export const metadata: Metadata = {
  title: "Runs · RayBrainOS2",
};

export default function RunsPage() {
  return <RunsView />;
}
