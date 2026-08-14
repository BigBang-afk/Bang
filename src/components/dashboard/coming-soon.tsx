import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export function ComingSoonPage({
  title,
  description,
  icon,
  phase,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} badge={phase} title={emptyTitle} description={emptyDescription} />
    </div>
  );
}
