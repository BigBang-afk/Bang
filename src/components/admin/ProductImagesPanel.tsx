"use client";

import { useEffect, useState, useRef } from "react";
import { Star, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/admin/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export function ProductImagesPanel({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = await res.json();
    setImages(data.product?.images ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [productId]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: formData });
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function setPrimary(id: string) {
    await fetch(`/api/admin/products/${productId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(images.map((img) => ({ id: img.id, sortOrder: img.sortOrder, isPrimary: img.id === id }))),
    });
    load();
  }

  async function removeImage(id: string) {
    if (!confirm("Delete this image?")) return;
    await fetch(`/api/admin/products/${productId}/images/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Card title="Product Images">
      <div className="grid grid-cols-3 gap-3">
        {images.map((img) => (
          <div key={img.id} className={clsx("group relative aspect-square overflow-hidden rounded-sm border-2", img.isPrimary ? "border-gold" : "border-transparent")}>
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => setPrimary(img.id)} title="Set as primary" className="rounded-full bg-white p-1.5 text-maroon">
                <Star className={clsx("h-3.5 w-3.5", img.isPrimary && "fill-gold text-gold")} />
              </button>
              <button onClick={() => removeImage(img.id)} title="Delete" className="rounded-full bg-white p-1.5 text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {img.isPrimary && <span className="absolute left-1 top-1 rounded-sm bg-gold px-1.5 py-0.5 text-[9px] font-medium text-maroon-dark">Primary</span>}
          </div>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-gold/40 py-6 text-sm text-brown-light hover:border-gold">
        <Upload className="h-5 w-5" />
        {uploading ? "Uploading…" : "Upload images (JPEG, PNG, WEBP up to 8MB)"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>
      <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={() => fileInputRef.current?.click()}>
        Choose Files
      </Button>
    </Card>
  );
}
