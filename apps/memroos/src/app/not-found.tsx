import { MemroosFallback } from "@/components/system/memroos-fallback";

export default function NotFound() {
  return (
    <MemroosFallback
      eyebrow="Route not found"
      title="This workspace route does not exist."
      message="That URL is not part of the current MemroOS control surface. The registry, workflow map, and knowledge views are still available."
      code="404"
      primaryHref="/flow"
      primaryLabel="Open Workflow Map"
      secondaryHref="/agents"
      secondaryLabel="Agents"
    />
  );
}
