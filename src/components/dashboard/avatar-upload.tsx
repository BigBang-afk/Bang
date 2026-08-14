"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateAvatarAction } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches the bucket's file_size_limit
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function AvatarUpload({
  userId,
  initials,
  avatarUrl,
}: {
  userId: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPEG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be smaller than 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "png";
      const path = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error("Upload failed. Please try again.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const result = await updateAvatarAction(publicUrl);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPreview(publicUrl);
      toast.success("Profile photo updated.");
      startTransition(() => router.refresh());
    } finally {
      setIsUploading(false);
    }
  }

  const busy = isUploading || isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar size="lg" className="size-16">
          {preview && <AvatarImage src={preview} alt="" />}
          <AvatarFallback className="bg-accent text-base text-accent-foreground">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile photo"
          className={cn(
            "absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
            busy && "pointer-events-none opacity-60"
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="text-sm">
        <p className="font-medium">Profile photo</p>
        <p className="text-muted-foreground">PNG, JPEG, WEBP or GIF. Max 2MB.</p>
      </div>
    </div>
  );
}
