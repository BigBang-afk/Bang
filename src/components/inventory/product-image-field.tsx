"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function ProductImageField({
  initialImageUrl,
  error,
}: {
  initialImageUrl?: string | null;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError("Only JPEG, PNG, or WEBP images are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setClientError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setClientError(null);
    setRemoved(false);
    setPreview(URL.createObjectURL(file));
  }

  function handleRemove() {
    setPreview(null);
    setRemoved(true);
    setClientError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-1.5">
      <Label>Product Image</Label>
      <div className="flex items-center gap-4">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-md border border-dashed border-border-strong bg-surface-elevated">
          {preview ? (
            <Image src={preview} alt="Product preview" width={96} height={96} className="size-24 object-cover" unoptimized={preview.startsWith("blob:")} />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {preview ? "Replace image" : "Upload image"}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="size-3.5" />
              Remove
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">JPEG, PNG, or WEBP. Max 5 MB.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input type="hidden" name="removeImage" value={removed ? "true" : ""} />
      {(clientError || error) && <p className="text-xs text-danger">{clientError ?? error}</p>}
    </div>
  );
}
