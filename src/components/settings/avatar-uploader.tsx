"use client";

import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  confirmAvatarAction,
  createAvatarUploadAction,
  removeAvatarAction,
} from "@/modules/identity/presentation/actions";

const SIZE = 256;

async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.86);
  });
  if (!blob) throw new Error("Could not process image");
  return blob;
}

export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image.");
      return;
    }
    setBusy(true);
    try {
      const blob = await resize(file);
      setPreview(URL.createObjectURL(blob));
      const signed = await createAvatarUploadAction({ contentType: blob.type, size: blob.size });
      if (!signed.ok) throw new Error(signed.error.message);

      const res = await fetch(signed.data.url, {
        method: "PUT",
        body: blob,
        headers: signed.data.headers,
      });
      if (!res.ok) throw new Error("Upload failed. Check your connection and try again.");

      const confirmed = await confirmAvatarAction(signed.data.key);
      if (!confirmed.ok) throw new Error(confirmed.error.message);
      toast.success("Looking good! Avatar updated.");
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = () => {
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res.ok) {
        setPreview(null);
        toast.success("Avatar removed");
      } else toast.error(res.error.message);
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} src={preview ?? src} size={72} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-overlay">
            <LoaderCircle className="size-6 animate-spin text-white" aria-hidden />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic"
          className="sr-only"
          id="avatar-file"
          aria-label="Upload profile photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden />
          {src || preview ? "Change photo" : "Upload photo"}
        </Button>
        {(src ?? preview) && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
            <Trash2 aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
