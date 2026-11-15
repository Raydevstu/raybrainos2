import type { Metadata } from "next";
import { KnowledgeView } from "@/components/workspace/secondary/knowledge-view";

export const metadata: Metadata = {
  title: "Knowledge · RayBrainOS2",
};

export default function KnowledgePage() {
  return <KnowledgeView />;
}
