import type { Operations } from "unpic";

/**
 * Tells whether a given image src points at our local asset endpoint and is
 * therefore eligible for server-side resizing/transcoding.
 */
export function isKarakeepAssetUrl(src: string): boolean {
  return /^\/api\/(public\/)?assets\/[^?#]+/.test(src);
}

export function karakeepImageTransformer(
  src: string | URL,
  operations: Operations,
): string {
  const url = typeof src === "string" ? src : src.toString();
  if (!isKarakeepAssetUrl(url)) {
    return url;
  }

  const [pathPart, hash] = url.split("#", 2);
  const [path, existingQs] = pathPart.split("?", 2);
  const params = new URLSearchParams(existingQs ?? "");
  if (operations.width !== undefined) {
    params.set("w", Math.round(Number(operations.width)).toString());
  }
  if (operations.height !== undefined) {
    params.set("h", Math.round(Number(operations.height)).toString());
  }
  if (operations.quality !== undefined) {
    params.set("q", Math.round(Number(operations.quality)).toString());
  }
  if (operations.format !== undefined) {
    params.set("fmt", String(operations.format));
  }

  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}
