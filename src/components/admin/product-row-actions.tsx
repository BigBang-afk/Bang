"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Copy, Trash2, RotateCcw, Star, Sparkles, Power } from "lucide-react";
import {
  deleteProductAction, restoreProductAction, duplicateProductAction, toggleProductFlagAction,
} from "@/app/admin/(protected)/products/actions";
import type { ProductWithRelations } from "@/types/database";

export function ProductRowActions({ product }: { product: ProductWithRelations }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/products/${product.id}/edit`} aria-label="Edit" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal">
        <Pencil size={15} />
      </Link>
      <button
        type="button" title="Toggle active" disabled={isPending}
        onClick={() => startTransition(async () => {
          await toggleProductFlagAction(product.id, "is_active", !product.is_active);
          toast.success(product.is_active ? "Deactivated" : "Activated");
        })}
        className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
      >
        <Power size={15} className={product.is_active ? "text-green-600" : ""} />
      </button>
      <button
        type="button" title="Toggle featured" disabled={isPending}
        onClick={() => startTransition(async () => {
          await toggleProductFlagAction(product.id, "is_featured", !product.is_featured);
          toast.success("Updated");
        })}
        className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
      >
        <Star size={15} className={product.is_featured ? "fill-gold text-gold" : ""} />
      </button>
      <button
        type="button" title="Toggle new arrival" disabled={isPending}
        onClick={() => startTransition(async () => {
          await toggleProductFlagAction(product.id, "is_new_arrival", !product.is_new_arrival);
          toast.success("Updated");
        })}
        className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
      >
        <Sparkles size={15} className={product.is_new_arrival ? "text-gold-dark" : ""} />
      </button>
      <button
        type="button" title="Duplicate" disabled={isPending}
        onClick={() => startTransition(async () => {
          await duplicateProductAction(product.id);
          toast.success("Product duplicated as draft");
        })}
        className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
      >
        <Copy size={15} />
      </button>
      {product.deleted_at ? (
        <button
          type="button" title="Restore" disabled={isPending}
          onClick={() => startTransition(async () => {
            await restoreProductAction(product.id);
            toast.success("Product restored");
          })}
          className="rounded-sm p-1.5 text-green-600 hover:bg-green-50"
        >
          <RotateCcw size={15} />
        </button>
      ) : (
        <button
          type="button" title="Delete" disabled={isPending}
          onClick={() => {
            if (!window.confirm("Move this product to trash?")) return;
            startTransition(async () => {
              await deleteProductAction(product.id, false);
              toast.success("Product moved to trash");
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
