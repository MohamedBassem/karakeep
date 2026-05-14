import { Context } from "hono";
import { stream } from "hono/streaming";
import sharp from "sharp";
import { z } from "zod";

import {
  createAssetReadStream,
  IMAGE_ASSET_TYPES,
  readAssetMetadata,
} from "@karakeep/shared/assetdb";

const MAX_DIMENSION = 4096;
const DEFAULT_QUALITY = 80;

const formatSchema = z.enum(["auto", "webp", "avif", "jpeg", "png"]);

export const imageOptimizationQuerySchema = z.object({
  w: z.coerce.number().int().positive().max(MAX_DIMENSION).optional(),
  h: z.coerce.number().int().positive().max(MAX_DIMENSION).optional(),
  q: z.coerce.number().int().min(1).max(100).optional(),
  fmt: formatSchema.optional(),
});

export type ImageOptimizationQuery = z.infer<
  typeof imageOptimizationQuerySchema
>;

export function hasOptimizationParams(query: ImageOptimizationQuery): boolean {
  return (
    query.w !== undefined ||
    query.h !== undefined ||
    query.q !== undefined ||
    (query.fmt !== undefined && query.fmt !== "auto")
  );
}

function pickOutputFormat(
  requested: ImageOptimizationQuery["fmt"],
  accept: string | undefined,
  sourceContentType: string,
): "webp" | "avif" | "jpeg" | "png" {
  if (requested && requested !== "auto") {
    return requested;
  }
  const acceptLower = (accept ?? "").toLowerCase();
  if (acceptLower.includes("image/avif")) return "avif";
  if (acceptLower.includes("image/webp")) return "webp";
  // Preserve transparency-capable sources as PNG, otherwise JPEG.
  if (
    sourceContentType === "image/png" ||
    sourceContentType === "image/gif" ||
    sourceContentType === "image/webp"
  ) {
    return "png";
  }
  return "jpeg";
}

function contentTypeForFormat(
  format: "webp" | "avif" | "jpeg" | "png",
): string {
  switch (format) {
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
  }
}

export async function serveOptimizedImage(
  c: Context,
  assetId: string,
  userId: string,
  query: ImageOptimizationQuery,
) {
  const metadata = await readAssetMetadata({ userId, assetId });

  // If the underlying asset is not an image we can transcode, fall through to
  // the caller so it can serve the original.
  if (!IMAGE_ASSET_TYPES.has(metadata.contentType)) {
    return null;
  }

  // GIFs may be animated; resizing would drop frames silently. Skip optimization.
  if (metadata.contentType === "image/gif") {
    return null;
  }

  const outputFormat = pickOutputFormat(
    query.fmt,
    c.req.header("Accept"),
    metadata.contentType,
  );
  const quality = query.q ?? DEFAULT_QUALITY;

  const sourceStream = await createAssetReadStream({ userId, assetId });

  let pipeline = sharp({ failOn: "none" }).rotate();

  if (query.w !== undefined || query.h !== undefined) {
    pipeline = pipeline.resize({
      width: query.w,
      height: query.h,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  switch (outputFormat) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
  }

  const outputBuffer = await new Promise<Buffer>((resolve, reject) => {
    sourceStream.on("error", reject);
    sourceStream.pipe(pipeline).toBuffer((err, buf) => {
      if (err) reject(err);
      else resolve(buf);
    });
  });

  c.header("Content-Type", contentTypeForFormat(outputFormat));
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "private, max-age=31536000, immutable");
  c.header("Vary", "Accept");
  c.header("Content-Length", outputBuffer.byteLength.toString());
  c.status(200);

  return stream(c, async (s) => {
    await s.write(outputBuffer);
  });
}
