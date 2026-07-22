"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Copy } from "lucide-react";
import { deleteMediaFileAction } from "./actions";
import { formatDateTime } from "@/lib/utils";
import type { MediaFile } from "@/types/database";

export function MediaGrid({ files }: { files: MediaFile[] }) {
  const [isPending, startTransition] = useTransition();

  if (files.length === 0) return <p className="text-sm text-charcoal/50">No media uploaded yet. Images uploaded from product, category, collection, banner and testimonial forms will appear here.</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {files.map((f) => (
        <div key={f.id} className="group relative overflow-hidden rounded-sm border border-charcoal/10 bg-white">
          <div className="relative aspect-square bg-ivory-dark">
            <Image src={f.url} alt={f.alt_text ?? f.file_name} fill className="object-cover" />
          </div>
          <div className="p-2">
            <p className="truncate text-xs text-charcoal/70">{f.file_name}</p>
            <p className="text-[10px] text-charcoal/40">{(f.file_size_bytes / 1024).toFixed(0)} KB · {formatDateTime(f.created_at)}</p>
          </div>
          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button" aria-label="Copy URL"
              onClick={() => { navigator.clipboard.writeText(f.url); toast.success("URL copied"); }}
              className="rounded-full bg-white/90 p-1.5 text-charcoal shadow hover:bg-white"
            >
              <Copy size={12} />
            </button>
            <button
              type="button" aria-label="Delete" disabled={isPending}
              onClick={() => {
                if (!window.confirm("Delete this file? It may still be referenced elsewhere.")) return;
                startTransition(async () => { await deleteMediaFileAction(f.file_path); toast.success("Deleted"); });
              }}
              className="rounded-full bg-white/90 p-1.5 text-red-500 shadow hover:bg-white"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
