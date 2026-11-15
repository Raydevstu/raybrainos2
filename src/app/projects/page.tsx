import type { Metadata } from "next";
import { ProjectsView } from "@/components/workspace/secondary/projects-view";

export const metadata: Metadata = {
  title: "Projects · RayBrainOS2",
};

export default function ProjectsPage() {
  return <ProjectsView />;
}
