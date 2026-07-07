import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Storage abstraction for infographic assets.
//
// The app owns its image storage (spec: Google Drive is a dropbox, not the
// permanent host). LocalDiskStorage is the default driver; an S3/R2 driver
// can implement the same interface later without touching callers. The
// Drive-inbox importer (Path B) will download files from Drive and push them
// through the same `put` path.

export interface StoredAsset {
  storageKey: string;
  thumbnailKey: string;
  originalUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

export interface StorageDriver {
  put(buffer: Buffer, opts: { filename: string; mimeType: string }): Promise<StoredAsset>;
  get(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  delete(storageKey: string): Promise<void>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./.data/uploads";
const THUMB_WIDTH = 480;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([m, e]) => [e, m]),
);

class LocalDiskStorage implements StorageDriver {
  private root = path.resolve(UPLOAD_DIR);

  private resolveSafe(storageKey: string): string {
    const full = path.resolve(this.root, storageKey);
    if (!full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(buffer: Buffer, opts: { filename: string; mimeType: string }): Promise<StoredAsset> {
    const ext = EXT_BY_MIME[opts.mimeType];
    if (!ext) throw new Error(`Unsupported image type: ${opts.mimeType}`);

    const id = crypto.randomBytes(12).toString("hex");
    const storageKey = `originals/${id}.${ext}`;
    const thumbnailKey = `thumbs/${id}.webp`;

    await fs.mkdir(path.join(this.root, "originals"), { recursive: true });
    await fs.mkdir(path.join(this.root, "thumbs"), { recursive: true });
    await fs.writeFile(this.resolveSafe(storageKey), buffer);

    let width: number | null = null;
    let height: number | null = null;
    try {
      const image = sharp(buffer);
      const meta = await image.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      await image.resize({ width: THUMB_WIDTH }).webp({ quality: 80 }).toFile(
        this.resolveSafe(thumbnailKey),
      );
    } catch {
      // Thumbnail generation is best-effort; fall back to the original.
      await fs.copyFile(this.resolveSafe(storageKey), this.resolveSafe(thumbnailKey));
    }

    return {
      storageKey,
      thumbnailKey,
      originalUrl: `/api/assets/${storageKey}`,
      thumbnailUrl: `/api/assets/${thumbnailKey}`,
      mimeType: opts.mimeType,
      sizeBytes: buffer.byteLength,
      width,
      height,
    };
  }

  async get(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const buffer = await fs.readFile(this.resolveSafe(storageKey));
      const ext = path.extname(storageKey).slice(1).toLowerCase();
      return { buffer, mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolveSafe(storageKey));
    } catch {
      // already gone
    }
  }
}

export const storage: StorageDriver = new LocalDiskStorage();

// Drive image URL helper for prototype-era assets that still live on Google
// Drive (referenced by file ID until they are imported into app storage).
export function driveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function driveThumbnailUrl(fileId: string, width = 640): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}
