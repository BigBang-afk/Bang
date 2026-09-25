import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState title="Page not found" description="This lead may have been deleted, or the link is wrong." action={{ href: "/", label: "Back to dashboard" }} />
    </div>
  );
}
