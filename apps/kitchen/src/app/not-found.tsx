import { KitchenFallback } from "@/components/system/kitchen-fallback";

export default function NotFound() {
  return (
    <KitchenFallback
      eyebrow="Station not found"
      title="This order never reached a station."
      message="That route does not exist in agentkitchen.dev. The fleet is still here, but this URL is not part of the current control surface."
      code="404"
      primaryHref="/flow"
      primaryLabel="Open the Flow"
      secondaryHref="/agents"
      secondaryLabel="Agent Registry"
    />
  );
}
