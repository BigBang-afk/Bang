"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export function RowActions({
  editHref,
  isActive,
  onToggle,
  onDelete,
  deleteLabel = "Delete",
  confirmMessage = "Are you sure? This cannot be undone.",
}: {
  editHref?: string;
  isActive?: boolean;
  onToggle?: (next: boolean) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleteLabel?: string;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      {editHref && (
        <Link href={editHref} aria-label="Edit" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal">
          <Pencil size={15} />
        </Link>
      )}
      {onToggle && (
        <button
          type="button"
          aria-label={isActive ? "Deactivate" : "Activate"}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await onToggle(!isActive);
                toast.success(isActive ? "Deactivated" : "Activated");
              } catch {
                toast.error("Failed to update status");
              }
            })
          }
          className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
        >
          {isActive ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={deleteLabel}
          disabled={isPending}
          onClick={() => {
            if (!window.confirm(confirmMessage)) return;
            startTransition(async () => {
              try {
                await onDelete();
                toast.success("Deleted");
              } catch {
                toast.error("Failed to delete");
              }
            });
          }}
          className="rounded-sm p-1.5 text-red-500 hover:bg-red-50"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
