"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, ImagePlus } from "lucide-react";

export interface UploadedAsset {
  id: string;
  originalUrl: string;
  thumbnailUrl: string | null;
}

// Mobile-friendly image uploader: tap target, camera/gallery on phones,
// drag & drop on desktop. Stores into app-controlled storage via /api/uploads.
export function ImageUpload({
  onUploaded,
  current,
  label = "Upload infographic image",
}: {
  onUploaded: (asset: UploadedAsset) => void;
  current?: UploadedAsset | null;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded(data.asset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={clsx(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors",
          dragging
            ? "border-violet-500 bg-violet-500/5"
            : "border-black/15 hover:border-violet-400 dark:border-white/20",
        )}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.thumbnailUrl ?? current.originalUrl}
            alt="Uploaded infographic"
            className="max-h-48 rounded-lg object-contain"
          />
        ) : (
          <ImagePlus className="h-6 w-6 text-zinc-400" />
        )}
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {uploading ? "Uploading…" : current ? "Replace image" : label}
        </span>
        <span className="text-xs text-zinc-400">
          PNG, JPG or WebP · tap to pick from phone or drop a file
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
