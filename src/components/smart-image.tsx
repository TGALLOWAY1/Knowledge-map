"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ImageOff } from "lucide-react";

// <img> with a graceful fallback. Seeded assets are Drive-hosted; when a URL
// can't load (file not link-shared, offline, blocked network) the browser's
// broken-image glyph and raw alt-text spill are replaced with a tidy
// placeholder (or a custom fallback node).

export function SmartImage({
  src,
  alt,
  className,
  style,
  fallback,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  fallbackClassName?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={clsx(
          "flex flex-col items-center justify-center gap-1.5 bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
          fallbackClassName,
        )}
        role="img"
        aria-label={alt}
        title={alt}
      >
        <ImageOff className="h-6 w-6" />
        <span className="px-3 text-center text-xs">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
